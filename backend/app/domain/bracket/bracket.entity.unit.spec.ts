import { test } from '@japa/runner'
import { BRACKET_STATUS, CATEGORY, MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import { Bracket } from './bracket.entity.ts'

const NOW = new Date('2026-10-29T12:00:00.000Z')
const LATER = new Date('2026-10-29T15:00:00.000Z')

/** Ids sequenciais e sorteio sem embaralhar: o resultado é sempre o mesmo. */
function draw(total: number) {
  let count = 0
  const classroomIds = Array.from({ length: total }, (_, index) => `C${index + 1}`)

  const drawn = Bracket.draw({
    id: 'bracket',
    sportId: 'sport',
    category: CATEGORY.F2,
    minAthletes: 5,
    classroomIds,
    newId: () => `id-${++count}`,
    random: () => 0,
    now: NOW,
  })
  if (drawn.isLeft()) throw new Error('sorteio inválido no arranjo')

  return drawn.value
}

function teamOfClassroom(bracket: Bracket, classroomId: string): string {
  const team = bracket.snapshot().teams.find((candidate) => candidate.classroomId === classroomId)
  if (!team) throw new Error('time ausente no arranjo')

  return team.id
}

function matchAt(bracket: Bracket, phase: string, position: number) {
  const match = bracket
    .snapshot()
    .matches.find((candidate) => candidate.phase === phase && candidate.position === position)
  if (!match) throw new Error('partida ausente no arranjo')

  return match
}

test.group('Bracket > sorteio', () => {
  test('com 4 turmas nascem 2 semifinais e a final vazia', ({ assert }) => {
    const { matches, teams, status } = draw(4).snapshot()

    assert.equal(status, BRACKET_STATUS.KNOCKOUT)
    assert.lengthOf(teams, 4)
    assert.lengthOf(matches, 3)
    assert.lengthOf(
      matches.filter((match) => match.phase === MATCH_PHASE.SEMI),
      2,
    )
    const final = matches.find((match) => match.phase === MATCH_PHASE.FINAL)
    assert.deepInclude(final, { homeTeamId: null, awayTeamId: null, round: 2 })
  })

  test('com 3 turmas a de folga entra direto na final', ({ assert }) => {
    const { matches, teams } = draw(3).snapshot()
    const final = matches.find((match) => match.phase === MATCH_PHASE.FINAL)

    assert.lengthOf(teams, 3)
    assert.lengthOf(matches, 2)
    assert.isString(final?.homeTeamId ?? final?.awayTeamId)
  })

  test('com 13 turmas há 3 folgas, 12 partidas e todas as partidas nascem a jogar', ({
    assert,
  }) => {
    const { matches } = draw(13).snapshot()

    assert.lengthOf(matches, 12)
    assert.isTrue(matches.every((match) => match.status === MATCH_STATUS.SCHEDULED))
    assert.lengthOf(
      matches.filter((match) => match.phase === MATCH_PHASE.ROUND_OF_16),
      5,
    )
  })

  test('menos de duas turmas é NOT_ENOUGH_TEAMS com o mínimo de atletas', ({ assert }) => {
    const drawn = Bracket.draw({
      id: 'b',
      sportId: 's',
      category: CATEGORY.F1,
      minAthletes: 5,
      classroomIds: ['C1'],
      newId: () => 'x',
      random: () => 0,
      now: NOW,
    })

    assert.deepEqual(drawn.value, { code: 'NOT_ENOUGH_TEAMS', minTeams: 2, minAthletes: 5 })
  })

  test('mais de 16 turmas é TOO_MANY_TEAMS', ({ assert }) => {
    const drawn = Bracket.draw({
      id: 'b',
      sportId: 's',
      category: CATEGORY.F1,
      minAthletes: 1,
      classroomIds: Array.from({ length: 17 }, (_, index) => `C${index}`),
      newId: () => 'x',
      random: () => 0,
      now: NOW,
    })

    assert.deepEqual(drawn.value, { code: 'TOO_MANY_TEAMS', maxTeams: 16 })
  })
})

test.group('Bracket > placar', () => {
  test('o vencedor avança para a vaga da partida seguinte', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 0)

    const scored = bracket.score(semi.id, { homeScore: 2, awayScore: 1 }, LATER)

    assert.isTrue(scored.isRight())
    assert.deepInclude(matchAt(bracket, MATCH_PHASE.SEMI, 0), {
      status: MATCH_STATUS.FINISHED,
      winnerTeamId: semi.homeTeamId,
      updatedAt: LATER,
    })
    assert.equal(matchAt(bracket, MATCH_PHASE.FINAL, 0).homeTeamId, semi.homeTeamId)
  })

  test('o vencedor da posição ímpar entra como visitante da final', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 1)

    bracket.score(semi.id, { homeScore: 0, awayScore: 3 }, LATER)

    assert.equal(matchAt(bracket, MATCH_PHASE.FINAL, 0).awayTeamId, semi.awayTeamId)
  })

  test('partida sem os dois times é MATCH_TEAMS_PENDING', ({ assert }) => {
    const bracket = draw(4)
    const final = matchAt(bracket, MATCH_PHASE.FINAL, 0)

    const scored = bracket.score(final.id, { homeScore: 1, awayScore: 0 }, LATER)

    assert.deepEqual(scored.value, { code: 'MATCH_TEAMS_PENDING' })
  })

  test('empate sem vencedor é MATCH_WINNER_REQUIRED, e com vencedor de fora também', ({
    assert,
  }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 0)

    const tied = bracket.score(semi.id, { homeScore: 1, awayScore: 1 }, LATER)
    const stranger = bracket.score(
      semi.id,
      { homeScore: 1, awayScore: 1, winnerTeamId: 'outro' },
      LATER,
    )

    assert.deepEqual(tied.value, { code: 'MATCH_WINNER_REQUIRED' })
    assert.deepEqual(stranger.value, { code: 'MATCH_WINNER_REQUIRED' })
  })

  test('empate com o vencedor dos pênaltis avança esse time', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 0)

    bracket.score(
      semi.id,
      { homeScore: 1, awayScore: 1, winnerTeamId: semi.awayTeamId ?? '' },
      LATER,
    )

    assert.equal(matchAt(bracket, MATCH_PHASE.FINAL, 0).homeTeamId, semi.awayTeamId)
  })

  test('partida de outra chave é MATCH_NOT_FOUND', ({ assert }) => {
    const scored = draw(4).score('nao-existe', { homeScore: 1, awayScore: 0 }, LATER)

    assert.deepEqual(scored.value, { code: 'MATCH_NOT_FOUND' })
  })

  test('corrigir o vencedor depois que a seguinte foi jogada é recusado', ({ assert }) => {
    const bracket = draw(4)
    const first = matchAt(bracket, MATCH_PHASE.SEMI, 0)
    const second = matchAt(bracket, MATCH_PHASE.SEMI, 1)
    bracket.score(first.id, { homeScore: 2, awayScore: 0 }, LATER)
    bracket.score(second.id, { homeScore: 2, awayScore: 0 }, LATER)
    const final = matchAt(bracket, MATCH_PHASE.FINAL, 0)
    bracket.score(final.id, { homeScore: 1, awayScore: 0 }, LATER)

    const corrected = bracket.score(first.id, { homeScore: 0, awayScore: 2 }, LATER)
    const sameWinner = bracket.score(first.id, { homeScore: 3, awayScore: 0 }, LATER)

    assert.deepEqual(corrected.value, { code: 'MATCH_NEXT_PLAYED_ON_SCORE' })
    assert.isTrue(sameWinner.isRight())
  })

  test('a final com placar encerra a chave com a campeã', ({ assert }) => {
    const bracket = draw(2)
    const final = matchAt(bracket, MATCH_PHASE.FINAL, 0)
    assert.isNull(bracket.champion())

    bracket.score(final.id, { homeScore: 4, awayScore: 2 }, LATER)

    assert.equal(bracket.snapshot().status, BRACKET_STATUS.FINISHED)
    assert.equal(bracket.champion(), final.homeTeamId)
  })
})

test.group('Bracket > desfazer placar', () => {
  test('tira o vencedor da vaga da seguinte e devolve a partida a jogar', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 0)
    bracket.score(semi.id, { homeScore: 2, awayScore: 1 }, LATER)

    const undone = bracket.unscore(semi.id, LATER)

    assert.isTrue(undone.isRight())
    assert.deepInclude(matchAt(bracket, MATCH_PHASE.SEMI, 0), {
      status: MATCH_STATUS.SCHEDULED,
      homeScore: null,
      awayScore: null,
      winnerTeamId: null,
    })
    assert.isNull(matchAt(bracket, MATCH_PHASE.FINAL, 0).homeTeamId)
  })

  test('partida sem placar é MATCH_NOT_PLAYED', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 0)

    assert.deepEqual(bracket.unscore(semi.id, LATER).value, { code: 'MATCH_NOT_PLAYED' })
  })

  test('com a seguinte já jogada é recusado', ({ assert }) => {
    const bracket = draw(4)
    const first = matchAt(bracket, MATCH_PHASE.SEMI, 0)
    const second = matchAt(bracket, MATCH_PHASE.SEMI, 1)
    bracket.score(first.id, { homeScore: 2, awayScore: 0 }, LATER)
    bracket.score(second.id, { homeScore: 2, awayScore: 0 }, LATER)
    bracket.score(matchAt(bracket, MATCH_PHASE.FINAL, 0).id, { homeScore: 1, awayScore: 0 }, LATER)

    assert.deepEqual(bracket.unscore(first.id, LATER).value, {
      code: 'MATCH_NEXT_PLAYED_ON_UNSCORE',
    })
  })

  test('desfazer a final reabre a chave', ({ assert }) => {
    const bracket = draw(2)
    const final = matchAt(bracket, MATCH_PHASE.FINAL, 0)
    bracket.score(final.id, { homeScore: 1, awayScore: 0 }, LATER)

    bracket.unscore(final.id, LATER)

    assert.equal(bracket.snapshot().status, BRACKET_STATUS.KNOCKOUT)
    assert.isNull(bracket.champion())
  })

  test('partida de outra chave é MATCH_NOT_FOUND', ({ assert }) => {
    assert.deepEqual(draw(4).unscore('nao-existe', LATER).value, { code: 'MATCH_NOT_FOUND' })
  })
})

test.group('Bracket > escalação', () => {
  test('diz os dois times da partida e o time da turma entre eles', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 0)
    const home = bracket.snapshot().teams.find((team) => team.id === semi.homeTeamId)

    const lineup = bracket.lineupOf(semi.id, home?.classroomId ?? null)

    assert.deepEqual(lineup, {
      homeTeamId: semi.homeTeamId,
      awayTeamId: semi.awayTeamId,
      classroomTeamId: semi.homeTeamId,
    })
  })

  test('turma que não joga a partida fica sem time, e partida alheia é null', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 0)
    const outsider = bracket
      .snapshot()
      .teams.find((team) => team.id !== semi.homeTeamId && team.id !== semi.awayTeamId)

    assert.isNull(bracket.lineupOf(semi.id, outsider?.classroomId ?? null)?.classroomTeamId)
    assert.isNull(bracket.lineupOf(semi.id, null)?.classroomTeamId)
    assert.isNull(bracket.lineupOf('nao-existe', null))
  })
})

test.group('Bracket > agenda e exclusão', () => {
  test('agenda data e local, e null desmarca', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 0)

    bracket.schedule(semi.id, { scheduledAt: LATER, location: 'Quadra 1' }, LATER)
    assert.deepInclude(matchAt(bracket, MATCH_PHASE.SEMI, 0), {
      scheduledAt: LATER,
      location: 'Quadra 1',
    })

    bracket.schedule(semi.id, { scheduledAt: null }, LATER)
    assert.deepInclude(matchAt(bracket, MATCH_PHASE.SEMI, 0), {
      scheduledAt: null,
      location: 'Quadra 1',
    })
  })

  test('agendar partida de outra chave é MATCH_NOT_FOUND', ({ assert }) => {
    assert.deepEqual(draw(4).schedule('nao-existe', {}, LATER).value, {
      code: 'MATCH_NOT_FOUND',
    })
  })

  test('chave sem placar pode ser apagada; com placar, BRACKET_HAS_RESULTS', ({ assert }) => {
    const bracket = draw(4)
    assert.isTrue(bracket.ensureDeletable().isRight())

    bracket.score(matchAt(bracket, MATCH_PHASE.SEMI, 0).id, { homeScore: 1, awayScore: 0 }, LATER)

    assert.deepEqual(bracket.ensureDeletable().value, { code: 'BRACKET_HAS_RESULTS' })
  })

  test('restore devolve a mesma chave que o snapshot guardou', ({ assert }) => {
    const bracket = draw(5)

    assert.deepEqual(Bracket.restore(bracket.snapshot()).snapshot(), bracket.snapshot())
    assert.isString(teamOfClassroom(bracket, 'C1'))
  })
})
