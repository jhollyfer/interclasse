import { test } from '@japa/runner'

import AdministratorSportDeleteUseCase from './delete.use-case.ts'

import { Sport } from '#domain/sport/sport.entity'
import { SportRepository } from '#repositories/sport/sport.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

const ID = '9b8a7f6e-5d4c-4b3a-8f2e-1d0c9b8a7f6e'

async function setup() {
  const sports = MemoryRepositories.sports()
  const dodgeball = Sport.create({
    id: ID,
    name: 'Queimada',
    minAthletes: 6,
    maxAthletes: 15,
    now: new Date(),
  })
  if (dodgeball.isLeft()) throw new Error('invalid arrangement')
  await sports.save(dodgeball.value)
  const useCase = await makeWithMemory(AdministratorSportDeleteUseCase, [[SportRepository, sports]])

  return { sports, useCase }
}

test.group('administrator/sports > delete (unit)', () => {
  test('deletes the unused sport', async ({ assert }) => {
    const { sports, useCase } = await setup()

    const result = await useCase.execute({ id: ID })

    assert.isTrue(result.isRight())
    assert.isNull(await sports.findById(ID))
  })

  test('with an enrollment or bracket is 409 SPORT_IN_USE and stays', async ({ assert }) => {
    const { sports, useCase } = await setup()
    sports.markInUse(ID)

    const result = await useCase.execute({ id: ID })

    assert.deepInclude(result.value, { status: 409, code: 'SPORT_IN_USE' })
    assert.isNotNull(await sports.findById(ID))
  })

  test('nonexistent is 404', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000' })

    assert.deepInclude(result.value, { status: 404, code: 'SPORT_NOT_FOUND' })
  })
})
