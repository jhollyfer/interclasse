import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { MATCH_PHASE } from '@interclasse/shared'

import AdministratorMatchUpdateUseCase from './update.use-case.ts'

import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = MemoryRepositories.brackets()
  const useCase = await makeWithMemory(
    AdministratorMatchUpdateUseCase,
    BracketUnitFixtures.bindings(brackets),
  )
  const { bracket } = await BracketUnitFixtures.drawn(brackets)
  const semi = bracket.snapshot().matches.find((match) => match.phase === MATCH_PHASE.SEMI)
  if (!semi) throw new Error('semifinal missing in the arrangement')

  return { useCase, semi }
}

test.group('administrator/matches > update (unit)', () => {
  test('schedules date and place, and returns the match with the classrooms', async ({
    assert,
  }) => {
    const { useCase, semi } = await setup()
    const scheduledAt = DateTime.fromISO('2026-11-03T14:30:00-04:00')

    const result = await useCase.execute({ id: semi.id, scheduledAt, location: 'Quadra 1' })

    if (result.isLeft()) throw new Error('schedule should be accepted')
    assert.equal(result.value.location, 'Quadra 1')
    assert.equal(
      DateTime.fromISO(result.value.scheduledAt ?? '').toMillis(),
      scheduledAt.toMillis(),
    )
    assert.isString(result.value.homeTeam?.classroom.name)
  })

  test('null unschedules and missing does not touch', async ({ assert }) => {
    const { useCase, semi } = await setup()
    await useCase.execute({
      id: semi.id,
      scheduledAt: DateTime.fromISO('2026-11-03T14:30:00-04:00'),
      location: 'Quadra 1',
    })

    const result = await useCase.execute({ id: semi.id, scheduledAt: null })

    if (result.isLeft()) throw new Error('schedule should be accepted')
    assert.isNull(result.value.scheduledAt)
    assert.equal(result.value.location, 'Quadra 1')
  })

  test('nonexistent match is 404 MATCH_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      id: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91',
      scheduledAt: null,
    })

    assert.deepInclude(result.value, { status: 404, code: 'MATCH_NOT_FOUND' })
  })
})
