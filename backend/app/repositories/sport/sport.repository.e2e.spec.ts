import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'

import { SportLucidRepository } from './sport.lucid.repository.ts'
import { SportMemoryRepository } from './sport.memory.repository.ts'
import type { SportRepository } from './sport.repository.ts'

import { resetDatabase } from '#tests/http-fixtures'
import { Sport } from '#domain/sport/sport.entity'

/**
 * The same contract in both implementations (`_standards/domain.md` §5.4): it is what
 * guarantees that the use case unit test, which runs on the in-memory one, does not pass
 * against a lying double.
 */
const IMPLEMENTATIONS = {
  lucid: () => app.container.make(SportLucidRepository),
  memory: async () => new SportMemoryRepository(),
} satisfies Record<string, () => Promise<SportRepository>>

const NOW = new Date('2026-10-29T12:00:00.000Z')

function sport(id: string, name: string): Sport {
  const created = Sport.create({ id, name, minAthletes: 1, maxAthletes: 10, now: NOW })
  if (created.isLeft()) throw new Error('invalid sport in the arrangement')

  return created.value
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`SportRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save and findById return the same sport', async ({ assert }) => {
      const repository = await make()
      const futsal = sport('4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91', 'Futsal')

      await repository.save(futsal)
      const found = await repository.findById(futsal.id)

      assert.deepEqual(found?.snapshot(), futsal.snapshot())
    })

    test('save of a name that belongs to another sport returns SPORT_ALREADY_EXISTS', async ({
      assert,
    }) => {
      const repository = await make()
      await repository.save(sport('4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91', 'Futsal'))

      const saved = await repository.save(sport('5c7a3d2f-4a3b-4d9f-8b2c-1a7e3f8d9ba2', 'Futsal'))

      assert.deepEqual(saved.value, { code: 'SPORT_ALREADY_EXISTS' })
    })

    test('findById of a nonexistent id is null', async ({ assert }) => {
      const repository = await make()

      assert.isNull(await repository.findById('0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f'))
    })

    test('existsByNameOrSlug finds by name and by slug, except itself', async ({ assert }) => {
      const repository = await make()
      const volleyball = sport('7e1d3c2b-1a0f-4e9d-8c7b-6a5f4e3d2c1b', 'Vôlei')
      await repository.save(volleyball)

      assert.isTrue(await repository.existsByNameOrSlug('Vôlei', 'x'))
      assert.isTrue(await repository.existsByNameOrSlug('x', 'volei'))
      assert.isFalse(await repository.existsByNameOrSlug('Vôlei', 'volei', volleyball.id))
    })

    test('paginate searches and sorts', async ({ assert }) => {
      const repository = await make()
      await repository.save(sport('1d2c3b4a-5f6e-4d8c-9b0a-1f2e3d4c5b6a', 'Queimada'))
      await repository.save(sport('2e3d4c5b-6a7f-4e9d-8c1b-2a3f4e5d6c7b', 'Futsal'))

      const page = await repository.paginate({
        page: 1,
        perPage: 10,
        search: 'u',
        sort: 'name',
        direction: 'asc',
      })

      assert.deepEqual(
        page.data.map((item) => item.name),
        ['Futsal', 'Queimada'],
      )
      assert.equal(page.meta.total, 2)
    })

    test('delete removes the sport', async ({ assert }) => {
      const repository = await make()
      const tableTennis = sport('3f4e5d6c-7b8a-4f0e-9d2c-3b4a5f6e7d8c', 'Tênis de mesa')
      await repository.save(tableTennis)

      await repository.delete(tableTennis)

      assert.isNull(await repository.findById(tableTennis.id))
    })
  })
}
