import { test } from '@japa/runner'
import { MATCH_PHASE } from '@interclasse/shared'

import AdministratorMatchAthletesUseCase from './athletes.use-case.ts'

import { BracketMemoryRepository } from '#repositories/bracket/bracket.memory.repository'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/unit-fixtures'

async function setup() {
  const brackets = new BracketMemoryRepository()
  const useCase = await makeWithMemory(
    AdministratorMatchAthletesUseCase,
    BracketUnitFixtures.bindings(brackets),
  )

  return { brackets, useCase }
}

test.group('administrator/matches > athletes (unit)', () => {
  test('lista os alunos das duas turmas da partida, os inscritos marcados', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { bracket } = await BracketUnitFixtures.drawn(brackets)
    const semi = bracket.snapshot().matches.find((match) => match.phase === MATCH_PHASE.SEMI)

    const result = await useCase.execute({ id: semi?.id ?? '' })

    if (result.isLeft()) throw new Error('atletas deveriam existir')
    assert.lengthOf(result.value.teams, 2)
    assert.isTrue(result.value.teams.every((team) => team.students.every((s) => s.enrolled)))
  })

  test('partida inexistente é 404 MATCH_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91' })

    assert.deepInclude(result.value, { status: 404, code: 'MATCH_NOT_FOUND' })
  })
})
