import { test } from '@japa/runner'

import StorefrontSportPaginateUseCase from './paginate.use-case.ts'

import { SportRepository } from '#repositories/sport/sport.repository'
import { SportMemoryRepository } from '#repositories/sport/sport.memory.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { seedSport } from '#tests/sports-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const sports = new SportMemoryRepository()
  const useCase = await makeWithMemory(StorefrontSportPaginateUseCase, [[SportRepository, sports]])

  return { sports, useCase }
}

test.group('storefront/sports > paginate (unit)', () => {
  test('lista as modalidades em ordem de nome', async ({ assert }) => {
    const { sports, useCase } = await setup()
    await seedSport(sports, 'Queimada')
    await seedSport(sports, 'Futsal')

    const page = rightOf(await useCase.execute({}))

    assert.deepEqual(
      page.data.map((sport) => sport.name),
      ['Futsal', 'Queimada'],
    )
  })

  test('falha do repositório é 500 STOREFRONT_SPORT_PAGINATE_ERROR', async ({ assert }) => {
    const { sports, useCase } = await setup()
    sports.paginate = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({})

    assert.deepInclude(result.value, { status: 500, code: 'STOREFRONT_SPORT_PAGINATE_ERROR' })
  })
})
