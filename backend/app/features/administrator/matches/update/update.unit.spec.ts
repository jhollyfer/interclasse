import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { MATCH_PHASE } from '@interclasse/shared'

import AdministratorMatchUpdateUseCase from './update.use-case.ts'

import { BracketMemoryRepository } from '#repositories/bracket/bracket.memory.repository'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = new BracketMemoryRepository()
  const useCase = await makeWithMemory(
    AdministratorMatchUpdateUseCase,
    BracketUnitFixtures.bindings(brackets),
  )
  const { bracket } = await BracketUnitFixtures.drawn(brackets)
  const semi = bracket.snapshot().matches.find((match) => match.phase === MATCH_PHASE.SEMI)
  if (!semi) throw new Error('semifinal ausente no arranjo')

  return { useCase, semi }
}

test.group('administrator/matches > update (unit)', () => {
  test('agenda data e local, e devolve a partida com as turmas', async ({ assert }) => {
    const { useCase, semi } = await setup()
    const scheduledAt = DateTime.fromISO('2026-11-03T14:30:00-04:00')

    const result = await useCase.execute({ id: semi.id, scheduledAt, location: 'Quadra 1' })

    if (result.isLeft()) throw new Error('agenda deveria ser aceita')
    assert.equal(result.value.location, 'Quadra 1')
    assert.equal(
      DateTime.fromISO(result.value.scheduledAt ?? '').toMillis(),
      scheduledAt.toMillis(),
    )
    assert.isString(result.value.homeTeam?.classroom.name)
  })

  test('null desmarca e ausente não mexe', async ({ assert }) => {
    const { useCase, semi } = await setup()
    await useCase.execute({
      id: semi.id,
      scheduledAt: DateTime.fromISO('2026-11-03T14:30:00-04:00'),
      location: 'Quadra 1',
    })

    const result = await useCase.execute({ id: semi.id, scheduledAt: null })

    if (result.isLeft()) throw new Error('agenda deveria ser aceita')
    assert.isNull(result.value.scheduledAt)
    assert.equal(result.value.location, 'Quadra 1')
  })

  test('partida inexistente é 404 MATCH_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      id: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91',
      scheduledAt: null,
    })

    assert.deepInclude(result.value, { status: 404, code: 'MATCH_NOT_FOUND' })
  })
})
