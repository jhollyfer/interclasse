import { test } from '@japa/runner'
import { BRACKET_STATUS, MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import AdministratorMatchUnscoreUseCase from './unscore.use-case.ts'

import { MemoryRepositories } from '#tests/memory-fixtures'
import { type BracketRepository } from '#repositories/bracket/bracket.repository'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup(total = 4) {
  const brackets = MemoryRepositories.brackets()
  const useCase = await makeWithMemory(
    AdministratorMatchUnscoreUseCase,
    BracketUnitFixtures.bindings(brackets),
  )
  const { bracket } = await BracketUnitFixtures.drawn(brackets, total)

  return { brackets, useCase, bracket }
}

/** Lança o placar direto na entidade e grava: o arranjo do que o desfazer desfaz. */
async function scored(
  brackets: BracketRepository,
  bracketId: string,
  matchId: string,
): Promise<void> {
  const bracket = await brackets.findById(bracketId)
  bracket?.score(matchId, { homeScore: 2, awayScore: 0 }, new Date())
  if (bracket) await brackets.save(bracket)
}

test.group('administrator/matches > unscore (unit)', () => {
  test('tira o placar e o vencedor da vaga da seguinte', async ({ assert }) => {
    const { brackets, useCase, bracket } = await setup()
    const semi = bracket.snapshot().matches.find((match) => match.phase === MATCH_PHASE.SEMI)
    await scored(brackets, bracket.id, semi?.id ?? '')

    const result = await useCase.execute({ id: semi?.id ?? '' })

    if (result.isLeft()) throw new Error('desfazer deveria ser aceito')
    assert.deepInclude(result.value, {
      status: MATCH_STATUS.SCHEDULED,
      homeScore: null,
      awayScore: null,
      winnerTeamId: null,
    })
    const saved = await brackets.findById(bracket.id)
    const final = saved?.snapshot().matches.find((match) => match.phase === MATCH_PHASE.FINAL)
    assert.isNull(final?.homeTeamId)
  })

  test('desfazer a final reabre a chave', async ({ assert }) => {
    const { brackets, useCase, bracket } = await setup(2)
    const final = bracket.snapshot().matches[0]
    await scored(brackets, bracket.id, final?.id ?? '')

    await useCase.execute({ id: final?.id ?? '' })

    const saved = await brackets.findById(bracket.id)
    assert.equal(saved?.snapshot().status, BRACKET_STATUS.KNOCKOUT)
  })

  test('partida inexistente é 404 MATCH_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91' })

    assert.deepInclude(result.value, { status: 404, code: 'MATCH_NOT_FOUND' })
  })

  test('partida sem placar é 409 MATCH_NOT_PLAYED', async ({ assert }) => {
    const { useCase, bracket } = await setup()
    const semi = bracket.snapshot().matches.find((match) => match.phase === MATCH_PHASE.SEMI)

    const result = await useCase.execute({ id: semi?.id ?? '' })

    assert.deepInclude(result.value, { status: 409, code: 'MATCH_NOT_PLAYED' })
  })

  test('com a seguinte já jogada é 409 NEXT_MATCH_PLAYED e o placar fica', async ({ assert }) => {
    const { brackets, useCase, bracket } = await setup()
    const matches = bracket.snapshot().matches
    const first = matches.find((match) => match.phase === MATCH_PHASE.SEMI && match.position === 0)
    const second = matches.find((match) => match.phase === MATCH_PHASE.SEMI && match.position === 1)
    const final = matches.find((match) => match.phase === MATCH_PHASE.FINAL)
    await scored(brackets, bracket.id, first?.id ?? '')
    await scored(brackets, bracket.id, second?.id ?? '')
    await scored(brackets, bracket.id, final?.id ?? '')

    const result = await useCase.execute({ id: first?.id ?? '' })

    assert.deepInclude(result.value, { status: 409, code: 'NEXT_MATCH_PLAYED' })
    const saved = await brackets.findById(bracket.id)
    const kept = saved?.snapshot().matches.find((match) => match.id === first?.id)
    assert.equal(kept?.status, MATCH_STATUS.FINISHED)
  })
})
