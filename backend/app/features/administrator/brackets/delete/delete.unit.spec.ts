import { test } from '@japa/runner'
import { MATCH_PHASE } from '@interclasse/shared'

import AdministratorBracketDeleteUseCase from './delete.use-case.ts'

import { BracketMemoryRepository } from '#repositories/bracket/bracket.memory.repository'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/unit-fixtures'

async function setup() {
  const brackets = new BracketMemoryRepository()
  const useCase = await makeWithMemory(
    AdministratorBracketDeleteUseCase,
    BracketUnitFixtures.bindings(brackets),
  )

  return { brackets, useCase }
}

test.group('administrator/brackets > delete (unit)', () => {
  test('apaga a chave sem placar', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { bracket } = await BracketUnitFixtures.drawn(brackets)

    const result = await useCase.execute({ id: bracket.id })

    assert.isTrue(result.isRight())
    assert.isNull(await brackets.findById(bracket.id))
  })

  test('chave inexistente é 404 BRACKET_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91' })

    assert.deepInclude(result.value, { status: 404, code: 'BRACKET_NOT_FOUND' })
  })

  test('chave com placar lançado é 409 BRACKET_HAS_RESULTS e fica', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { bracket } = await BracketUnitFixtures.drawn(brackets)
    const semi = bracket.snapshot().matches.find((match) => match.phase === MATCH_PHASE.SEMI)
    bracket.score(semi?.id ?? '', { homeScore: 1, awayScore: 0 }, new Date())
    await brackets.save(bracket)

    const result = await useCase.execute({ id: bracket.id })

    assert.deepInclude(result.value, { status: 409, code: 'BRACKET_HAS_RESULTS' })
    assert.isNotNull(await brackets.findById(bracket.id))
  })
})
