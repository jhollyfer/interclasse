import { test } from '@japa/runner'
import { BRACKET_STATUS, MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import AdministratorMatchScoreUseCase from './score.use-case.ts'

import { BracketMemoryRepository } from '#repositories/bracket/bracket.memory.repository'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup(total = 4) {
  const brackets = new BracketMemoryRepository()
  const useCase = await makeWithMemory(
    AdministratorMatchScoreUseCase,
    BracketUnitFixtures.bindings(brackets),
  )
  const { bracket } = await BracketUnitFixtures.drawn(brackets, total)
  const matches = bracket.snapshot().matches
  const semi = matches.find((match) => match.phase === MATCH_PHASE.SEMI && match.position === 0)
  const final = matches.find((match) => match.phase === MATCH_PHASE.FINAL)
  if (!semi || !final) throw new Error('partidas ausentes no arranjo')

  return { brackets, useCase, bracket, semi, final }
}

test.group('administrator/matches > score (unit)', () => {
  test('lança o placar e leva o vencedor à partida seguinte', async ({ assert }) => {
    const { brackets, useCase, bracket, semi } = await setup()

    const result = await useCase.execute({ id: semi.id, homeScore: 2, awayScore: 1 })

    if (result.isLeft()) throw new Error('placar deveria ser aceito')
    assert.deepInclude(result.value, {
      status: MATCH_STATUS.FINISHED,
      homeScore: 2,
      awayScore: 1,
      winnerTeamId: semi.homeTeamId,
    })
    const saved = await brackets.findById(bracket.id)
    const final = saved?.snapshot().matches.find((match) => match.phase === MATCH_PHASE.FINAL)
    assert.equal(final?.homeTeamId, semi.homeTeamId)
  })

  test('a final encerra a chave', async ({ assert }) => {
    const brackets = new BracketMemoryRepository()
    const useCase = await makeWithMemory(
      AdministratorMatchScoreUseCase,
      BracketUnitFixtures.bindings(brackets),
    )
    const { bracket } = await BracketUnitFixtures.drawn(brackets, 2)
    const final = bracket.snapshot().matches[0]

    await useCase.execute({ id: final?.id ?? '', homeScore: 3, awayScore: 0 })

    const saved = await brackets.findById(bracket.id)
    assert.equal(saved?.snapshot().status, BRACKET_STATUS.FINISHED)
    assert.equal(saved?.champion(), final?.homeTeamId)
  })

  test('partida inexistente é 404 MATCH_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      id: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91',
      homeScore: 1,
      awayScore: 0,
    })

    assert.deepInclude(result.value, { status: 404, code: 'MATCH_NOT_FOUND' })
  })

  test('partida sem os dois times é 409 MATCH_TEAMS_PENDING', async ({ assert }) => {
    const { useCase, final } = await setup()

    const result = await useCase.execute({ id: final.id, homeScore: 1, awayScore: 0 })

    assert.deepInclude(result.value, { status: 409, code: 'MATCH_TEAMS_PENDING' })
  })

  test('empate sem vencedor é 422 MATCH_WINNER_REQUIRED e não grava', async ({ assert }) => {
    const { brackets, useCase, bracket, semi } = await setup()

    const result = await useCase.execute({ id: semi.id, homeScore: 1, awayScore: 1 })

    assert.deepInclude(result.value, { status: 422, code: 'MATCH_WINNER_REQUIRED' })
    const saved = await brackets.findById(bracket.id)
    const unchanged = saved?.snapshot().matches.find((match) => match.id === semi.id)
    assert.equal(unchanged?.status, MATCH_STATUS.SCHEDULED)
  })

  test('empate com o vencedor dos pênaltis avança esse time', async ({ assert }) => {
    const { useCase, semi } = await setup()

    const result = await useCase.execute({
      id: semi.id,
      homeScore: 1,
      awayScore: 1,
      winnerTeamId: semi.awayTeamId ?? '',
    })

    if (result.isLeft()) throw new Error('placar deveria ser aceito')
    assert.equal(result.value.winnerTeamId, semi.awayTeamId)
  })

  test('corrigir o vencedor com a seguinte já jogada é 409 NEXT_MATCH_PLAYED', async ({
    assert,
  }) => {
    const { brackets, useCase, bracket, semi, final } = await setup()
    const other = bracket
      .snapshot()
      .matches.find((match) => match.phase === MATCH_PHASE.SEMI && match.position === 1)
    await useCase.execute({ id: semi.id, homeScore: 2, awayScore: 0 })
    await useCase.execute({ id: other?.id ?? '', homeScore: 2, awayScore: 0 })
    await useCase.execute({ id: final.id, homeScore: 1, awayScore: 0 })

    const result = await useCase.execute({ id: semi.id, homeScore: 0, awayScore: 2 })

    assert.deepInclude(result.value, { status: 409, code: 'NEXT_MATCH_PLAYED' })
    const saved = await brackets.findById(bracket.id)
    const kept = saved?.snapshot().matches.find((match) => match.id === semi.id)
    assert.equal(kept?.winnerTeamId, semi.homeTeamId)
  })
})
