import { test } from '@japa/runner'
import { BRACKET_STATUS, CATEGORY, MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import { Bracket } from './bracket.entity.ts'

const NOW = new Date('2026-10-29T12:00:00.000Z')
const LATER = new Date('2026-10-29T15:00:00.000Z')

/** Sequential ids and a draw without shuffling: the result is always the same. */
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
  if (drawn.isLeft()) throw new Error('invalid draw in the arrangement')

  return drawn.value
}

function teamOfClassroom(bracket: Bracket, classroomId: string): string {
  const team = bracket.snapshot().teams.find((candidate) => candidate.classroomId === classroomId)
  if (!team) throw new Error('team missing from the arrangement')

  return team.id
}

function matchAt(bracket: Bracket, phase: string, position: number) {
  const match = bracket
    .snapshot()
    .matches.find((candidate) => candidate.phase === phase && candidate.position === position)
  if (!match) throw new Error('match missing from the arrangement')

  return match
}

test.group('Bracket > draw', () => {
  test('with 4 classrooms, 2 semifinals and the empty final are born', ({ assert }) => {
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

  test('with 3 classrooms the bye one goes straight to the final', ({ assert }) => {
    const { matches, teams } = draw(3).snapshot()
    const final = matches.find((match) => match.phase === MATCH_PHASE.FINAL)

    assert.lengthOf(teams, 3)
    assert.lengthOf(matches, 2)
    assert.isString(final?.homeTeamId ?? final?.awayTeamId)
  })

  test('with 13 classrooms there are 3 byes, 12 matches and all matches are born to be played', ({
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

  test('fewer than two classrooms is NOT_ENOUGH_TEAMS with the minimum athletes', ({ assert }) => {
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

  test('more than 16 classrooms is TOO_MANY_TEAMS', ({ assert }) => {
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

test.group('Bracket > score', () => {
  test('the winner advances to the next match slot', ({ assert }) => {
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

  test('the winner of the odd position enters as the away team of the final', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 1)

    bracket.score(semi.id, { homeScore: 0, awayScore: 3 }, LATER)

    assert.equal(matchAt(bracket, MATCH_PHASE.FINAL, 0).awayTeamId, semi.awayTeamId)
  })

  test('a match without both teams is MATCH_TEAMS_PENDING', ({ assert }) => {
    const bracket = draw(4)
    const final = matchAt(bracket, MATCH_PHASE.FINAL, 0)

    const scored = bracket.score(final.id, { homeScore: 1, awayScore: 0 }, LATER)

    assert.deepEqual(scored.value, { code: 'MATCH_TEAMS_PENDING' })
  })

  test('a tie without a winner is MATCH_WINNER_REQUIRED, and so is one with an outside winner', ({
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

  test('a tie with the penalty winner advances that team', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 0)

    bracket.score(
      semi.id,
      { homeScore: 1, awayScore: 1, winnerTeamId: semi.awayTeamId ?? '' },
      LATER,
    )

    assert.equal(matchAt(bracket, MATCH_PHASE.FINAL, 0).homeTeamId, semi.awayTeamId)
  })

  test('a match from another bracket is MATCH_NOT_FOUND', ({ assert }) => {
    const scored = draw(4).score('nao-existe', { homeScore: 1, awayScore: 0 }, LATER)

    assert.deepEqual(scored.value, { code: 'MATCH_NOT_FOUND' })
  })

  test('correcting the winner after the next one was played is refused', ({ assert }) => {
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

  test('the final with a score closes the bracket with the champion', ({ assert }) => {
    const bracket = draw(2)
    const final = matchAt(bracket, MATCH_PHASE.FINAL, 0)
    assert.isNull(bracket.champion())

    bracket.score(final.id, { homeScore: 4, awayScore: 2 }, LATER)

    assert.equal(bracket.snapshot().status, BRACKET_STATUS.FINISHED)
    assert.equal(bracket.champion(), final.homeTeamId)
  })
})

test.group('Bracket > undo score', () => {
  test('removes the winner from the next slot and returns the match to be played', ({ assert }) => {
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

  test('a match without a score is MATCH_NOT_PLAYED', ({ assert }) => {
    const bracket = draw(4)
    const semi = matchAt(bracket, MATCH_PHASE.SEMI, 0)

    assert.deepEqual(bracket.unscore(semi.id, LATER).value, { code: 'MATCH_NOT_PLAYED' })
  })

  test('with the next one already played it is refused', ({ assert }) => {
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

  test('undoing the final reopens the bracket', ({ assert }) => {
    const bracket = draw(2)
    const final = matchAt(bracket, MATCH_PHASE.FINAL, 0)
    bracket.score(final.id, { homeScore: 1, awayScore: 0 }, LATER)

    bracket.unscore(final.id, LATER)

    assert.equal(bracket.snapshot().status, BRACKET_STATUS.KNOCKOUT)
    assert.isNull(bracket.champion())
  })

  test('a match from another bracket is MATCH_NOT_FOUND', ({ assert }) => {
    assert.deepEqual(draw(4).unscore('nao-existe', LATER).value, { code: 'MATCH_NOT_FOUND' })
  })
})

test.group('Bracket > lineup', () => {
  test('says the two teams of the match and the classroom team among them', ({ assert }) => {
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

  test('a classroom that does not play the match has no team, and a foreign match is null', ({
    assert,
  }) => {
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

test.group('Bracket > schedule and deletion', () => {
  test('schedules date and place, and null unschedules', ({ assert }) => {
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

  test('scheduling a match from another bracket is MATCH_NOT_FOUND', ({ assert }) => {
    assert.deepEqual(draw(4).schedule('nao-existe', {}, LATER).value, {
      code: 'MATCH_NOT_FOUND',
    })
  })

  test('a bracket without a score can be deleted; with a score, BRACKET_HAS_RESULTS', ({
    assert,
  }) => {
    const bracket = draw(4)
    assert.isTrue(bracket.ensureDeletable().isRight())

    bracket.score(matchAt(bracket, MATCH_PHASE.SEMI, 0).id, { homeScore: 1, awayScore: 0 }, LATER)

    assert.deepEqual(bracket.ensureDeletable().value, { code: 'BRACKET_HAS_RESULTS' })
  })

  test('restore returns the same bracket the snapshot kept', ({ assert }) => {
    const bracket = draw(5)

    assert.deepEqual(Bracket.restore(bracket.snapshot()).snapshot(), bracket.snapshot())
    assert.isString(teamOfClassroom(bracket, 'C1'))
  })
})
