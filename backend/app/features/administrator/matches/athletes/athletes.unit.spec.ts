import { test } from '@japa/runner'
import { MATCH_PHASE } from '@interclasse/shared'

import AdministratorMatchAthletesUseCase from './athletes.use-case.ts'

import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = MemoryRepositories.brackets()
  const useCase = await makeWithMemory(
    AdministratorMatchAthletesUseCase,
    BracketUnitFixtures.bindings(brackets),
  )

  return { brackets, useCase }
}

test.group('administrator/matches > athletes (unit)', () => {
  test('lists the students of the two classrooms of the match, the enrolled marked', async ({
    assert,
  }) => {
    const { brackets, useCase } = await setup()
    const { bracket } = await BracketUnitFixtures.drawn(brackets)
    const semi = bracket.snapshot().matches.find((match) => match.phase === MATCH_PHASE.SEMI)

    const result = await useCase.execute({ id: semi?.id ?? '' })

    if (result.isLeft()) throw new Error('athletes should exist')
    assert.lengthOf(result.value.teams, 2)
    assert.isTrue(result.value.teams.every((team) => team.students.every((s) => s.enrolled)))
  })

  test('nonexistent match is 404 MATCH_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91' })

    assert.deepInclude(result.value, { status: 404, code: 'MATCH_NOT_FOUND' })
  })
})
