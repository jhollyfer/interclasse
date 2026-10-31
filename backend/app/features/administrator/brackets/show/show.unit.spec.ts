import { test } from '@japa/runner'
import { BRACKET_STATUS, MATCH_PHASE } from '@interclasse/shared'

import AdministratorBracketShowUseCase from './show.use-case.ts'

import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = MemoryRepositories.brackets()
  const useCase = await makeWithMemory(
    AdministratorBracketShowUseCase,
    BracketUnitFixtures.bindings(brackets),
  )

  return { brackets, useCase }
}

test.group('administrator/brackets > show (unit)', () => {
  test('returns the whole bracket with the classroom names', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { bracket, sport } = await BracketUnitFixtures.drawn(brackets)

    const result = await useCase.execute({ id: bracket.id })

    if (result.isLeft()) throw new Error('bracket should exist')
    assert.deepInclude(result.value, { status: BRACKET_STATUS.KNOCKOUT, championTeamId: null })
    assert.equal(result.value.sport.name, sport.name)
    const semis = result.value.matches.filter((m) => m.phase === MATCH_PHASE.SEMI)
    assert.lengthOf(semis, 2)
    assert.isTrue(semis.every((match) => match.homeName !== null && match.awayName !== null))
  })

  test('nonexistent bracket is 404 BRACKET_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91' })

    assert.deepInclude(result.value, { status: 404, code: 'BRACKET_NOT_FOUND' })
  })
})
