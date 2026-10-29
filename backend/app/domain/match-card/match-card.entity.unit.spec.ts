import { test } from '@japa/runner'
import { CARD_COLOR } from '@interclasse/shared'

import { MatchCard } from './match-card.entity.ts'

const NOW = new Date('2026-10-29T12:00:00.000Z')

function launch(overrides: {
  homeTeamId?: string | null
  awayTeamId?: string | null
  studentTeamId?: string | null
}) {
  return MatchCard.launch({
    id: 'card',
    matchId: 'match',
    studentId: 'student',
    color: CARD_COLOR.YELLOW,
    note: null,
    now: NOW,
    homeTeamId: 'home',
    awayTeamId: 'away',
    studentTeamId: 'home',
    ...overrides,
  })
}

test.group('MatchCard', () => {
  test('lança o cartão com o time da turma do atleta', ({ assert }) => {
    const card = launch({ studentTeamId: 'away' })

    assert.isTrue(card.isRight())
    assert.deepInclude(card.isRight() && card.value.snapshot(), {
      id: 'card',
      matchId: 'match',
      teamId: 'away',
      studentId: 'student',
      color: CARD_COLOR.YELLOW,
      note: null,
      createdAt: NOW,
    })
  })

  test('partida sem os dois times é MATCH_TEAMS_PENDING', ({ assert }) => {
    assert.deepEqual(launch({ awayTeamId: null }).value, { code: 'MATCH_TEAMS_PENDING' })
    assert.deepEqual(launch({ homeTeamId: null }).value, { code: 'MATCH_TEAMS_PENDING' })
  })

  test('atleta de fora da partida é STUDENT_NOT_IN_MATCH', ({ assert }) => {
    assert.deepEqual(launch({ studentTeamId: null }).value, { code: 'STUDENT_NOT_IN_MATCH' })
    assert.deepEqual(launch({ studentTeamId: 'outro' }).value, { code: 'STUDENT_NOT_IN_MATCH' })
  })

  test('restore devolve o mesmo cartão que o snapshot guardou', ({ assert }) => {
    const card = launch({})
    if (card.isLeft()) throw new Error('cartão inválido no arranjo')

    assert.deepEqual(MatchCard.restore(card.value.snapshot()).snapshot(), card.value.snapshot())
  })
})
