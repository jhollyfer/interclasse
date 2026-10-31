import { test } from '@japa/runner'

import AdministratorSportCreateUseCase from './create.use-case.ts'

import { SportRepository } from '#repositories/sport/sport.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const sports = MemoryRepositories.sports()
  const useCase = await makeWithMemory(AdministratorSportCreateUseCase, [[SportRepository, sports]])

  return { sports, useCase }
}

test.group('administrator/sports > create (unit)', () => {
  test('registers with the slug from the name', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ name: 'Tênis de mesa', minAthletes: 1, maxAthletes: 2 })

    assert.isTrue(result.isRight())
    assert.deepInclude(result.value, { name: 'Tênis de mesa', slug: 'tenis-de-mesa' })
  })

  test('minimum above the maximum is 422 SPORT_INVALID_LIMITS', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ name: 'Vôlei', minAthletes: 9, maxAthletes: 6 })

    assert.isTrue(result.isLeft())
    assert.deepInclude(result.value, { status: 422, code: 'SPORT_INVALID_LIMITS' })
  })

  test('repeated name or slug is 409 SPORT_ALREADY_EXISTS', async ({ assert }) => {
    const { useCase } = await setup()
    await useCase.execute({ name: 'Futsal', minAthletes: 5, maxAthletes: 12 })

    const result = await useCase.execute({ name: 'FUTSAL', minAthletes: 5, maxAthletes: 12 })

    assert.deepInclude(result.value, { status: 409, code: 'SPORT_ALREADY_EXISTS' })
  })
})
