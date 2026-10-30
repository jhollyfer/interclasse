import { test } from '@japa/runner'

import AdministratorSportUpdateUseCase from './update.use-case.ts'

import { Sport } from '#domain/sport/sport.entity'
import { SportRepository } from '#repositories/sport/sport.repository'
import { SportMemoryRepository } from '#repositories/sport/sport.memory.repository'
import { makeWithMemory } from '#tests/container-fixtures'

const ID = '6a4f2e1d-0c9b-4a8f-8e7d-6c5b4a3f2e1d'

async function setup() {
  const sports = new SportMemoryRepository()
  const futsal = Sport.create({
    id: ID,
    name: 'Futsal',
    minAthletes: 5,
    maxAthletes: 12,
    now: new Date(),
  })
  if (futsal.isLeft()) throw new Error('arranjo inválido')
  await sports.save(futsal.value)
  const useCase = await makeWithMemory(AdministratorSportUpdateUseCase, [[SportRepository, sports]])

  return { sports, useCase }
}

test.group('administrator/sports > update (unit)', () => {
  test('modalidade inexistente é 404', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000', name: 'X' })

    assert.deepInclude(result.value, { status: 404, code: 'SPORT_NOT_FOUND' })
  })

  test('renomeia e troca o slug', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: ID, name: 'Futsal misto' })

    assert.deepInclude(result.value, { name: 'Futsal misto', slug: 'futsal-misto' })
  })

  test('máximo abaixo do maior elenco é 409 com o total no campo', async ({ assert }) => {
    const { sports, useCase } = await setup()
    sports.withRosters(ID, [7, 10])

    const result = await useCase.execute({ id: ID, maxAthletes: 8 })

    assert.deepInclude(result.value, { status: 409, code: 'SPORT_ROSTER_ABOVE_LIMIT' })
    assert.isTrue(result.isLeft() && String(result.value.errors?.maxAthletes).includes('10'))
  })

  test('nome de outra modalidade é 409 SPORT_ALREADY_EXISTS', async ({ assert }) => {
    const { sports, useCase } = await setup()
    const volei = Sport.create({
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      name: 'Vôlei',
      minAthletes: 6,
      maxAthletes: 12,
      now: new Date(),
    })
    if (volei.isLeft()) throw new Error('arranjo inválido')
    await sports.save(volei.value)

    const result = await useCase.execute({ id: ID, name: 'Vôlei' })

    assert.deepInclude(result.value, { status: 409, code: 'SPORT_ALREADY_EXISTS' })
  })
})
