import { test } from '@japa/runner'

import AdministratorSportShowUseCase from './show.use-case.ts'

import { SportRepository } from '#repositories/sport/sport.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'
import { seedSport } from '#tests/sports-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const sports = MemoryRepositories.sports()
  const useCase = await makeWithMemory(AdministratorSportShowUseCase, [[SportRepository, sports]])

  return { sports, useCase }
}

test.group('administrator/sports > show (unit)', () => {
  test('returns the sport with the slug', async ({ assert }) => {
    const { sports, useCase } = await setup()
    const id = await seedSport(sports, 'Queimada')

    const sport = rightOf(await useCase.execute({ id }))

    assert.deepInclude(sport, { id, name: 'Queimada', slug: 'queimada' })
  })

  test('nonexistent is 404 SPORT_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000' })

    assert.deepInclude(result.value, { status: 404, code: 'SPORT_NOT_FOUND' })
  })

  test('repository failure is 500 ADMINISTRATOR_SPORT_SHOW_ERROR', async ({ assert }) => {
    const { sports, useCase } = await setup()
    sports.findById = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000' })

    assert.deepInclude(result.value, { status: 500, code: 'ADMINISTRATOR_SPORT_SHOW_ERROR' })
  })
})
