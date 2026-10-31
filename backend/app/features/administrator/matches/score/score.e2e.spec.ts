import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { BRACKET_STATUS, MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import { MatchFactory } from '#database/factories/match.factory'
import { Stored } from '#tests/stored-fixtures'
import { drawnBracket, scheduledMatch, scoreAll } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('matches > score', (group) => {
  group.each.setup(() => resetDatabase())

  test('the score ends the match and comes out with the teams and the bracket', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket, home, match } = await scheduledMatch()

    const response = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: 3, awayScore: 1 })

    response.assertStatus(200)
    assert.equal(body(response).status, MATCH_STATUS.FINISHED)
    assert.equal(body(response).homeScore, 3)
    assert.equal(body(response).awayScore, 1)
    assert.equal(body(response).winnerTeamId, home.id)
    assert.isString(body(response).homeTeam.classroom.name)
    assert.equal(body(response).bracket.sport.id, bracket.sportId)
    // The match is the final: the bracket ends along with it.
    await bracket.refresh()
    assert.equal(bracket.status, BRACKET_STATUS.FINISHED)
  })

  test('from the draw to the champion: the winner advances on its own', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket } = await drawnBracket(client, admin, 4)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.SEMI)

    const before = await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin)
    const final = body(before).matches.find(
      (match: { phase: string }) => match.phase === MATCH_PHASE.FINAL,
    )
    assert.isString(final.homeTeamId)
    assert.isString(final.awayTeamId)

    // A draw requires who won on penalties.
    const noWinner = await client
      .put(`/administrator/matches/${final.id}/score`)
      .cookies(admin)
      .json({ homeScore: 1, awayScore: 1 })
    noWinner.assertStatus(422)
    assert.equal(body(noWinner).code, 'MATCH_WINNER_REQUIRED')

    const penalties = await client
      .put(`/administrator/matches/${final.id}/score`)
      .cookies(admin)
      .json({ homeScore: 1, awayScore: 1, winnerTeamId: final.awayTeamId })
    penalties.assertStatus(200)

    const after = await client.get(`/storefront/brackets/${bracket.id}`)
    assert.equal(body(after).status, 'FINISHED')
    assert.equal(body(after).championTeamId, final.awayTeamId)

    // Changing the winner of a semifinal after the final was played would rewrite the final.
    const semi = body(after).matches.find(
      (match: { phase: string; winnerTeamId: string; homeTeamId: string }) =>
        match.phase === MATCH_PHASE.SEMI && match.winnerTeamId === match.homeTeamId,
    )
    const comeback = await client
      .put(`/administrator/matches/${semi.id}/score`)
      .cookies(admin)
      .json({ homeScore: 0, awayScore: 5 })
    comeback.assertStatus(409)
    assert.equal(body(comeback).code, 'NEXT_MATCH_PLAYED')
  })

  test('correcting the score without changing the winner passes even with the next one played', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket } = await drawnBracket(client, admin, 4)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.SEMI)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.FINAL)
    const played = body(await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin))
    const semi = played.matches.find((match: { phase: string }) => match.phase === MATCH_PHASE.SEMI)

    // 2 x 1 becomes 4 x 0: the home team remains the winner, the final does not change.
    const response = await client
      .put(`/administrator/matches/${semi.id}/score`)
      .cookies(admin)
      .json({ homeScore: 4, awayScore: 0 })

    response.assertStatus(200)
    assert.equal(body(response).homeScore, 4)
    assert.equal(body(response).winnerTeamId, semi.homeTeamId)
  })

  test('draw with a winner from outside the match responds 422', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()

    const response = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: 2, awayScore: 2, winnerTeamId: randomUUID() })

    response.assertStatus(422)
    assert.equal(body(response).code, 'MATCH_WINNER_REQUIRED')
    assert.property(body(response).errors, 'winnerTeamId')
  })

  test('match without both teams responds 409', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket } = await scheduledMatch()
    const pending = await MatchFactory.merge({
      bracketId: bracket.id,
      phase: MATCH_PHASE.SEMI,
    }).create()

    const response = await client
      .put(`/administrator/matches/${pending.id}/score`)
      .cookies(admin)
      .json({ homeScore: 1, awayScore: 0 })

    response.assertStatus(409)
    assert.equal(body(response).code, 'MATCH_TEAMS_PENDING')
  })

  test('match that does not exist responds 404', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .put(`/administrator/matches/${randomUUID()}/score`)
      .cookies(admin)
      .json({ homeScore: 1, awayScore: 0 })

    response.assertStatus(404)
    assert.equal(body(response).code, 'MATCH_NOT_FOUND')
  })

  test('negative or fractional score responds 422 and does not save', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()

    const response = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: -1, awayScore: 1.5 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'homeScore')
    assert.property(body(response).errors, 'awayScore')
    await match.refresh()
    assert.equal(match.status, MATCH_STATUS.SCHEDULED)
    const bracket = await Stored.bracketOrFail(match.bracketId)
    assert.equal(bracket.status, BRACKET_STATUS.KNOCKOUT)
  })

  test('without a session is 401, and the advisor gets 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const url = `/administrator/matches/${randomUUID()}/score`
    const score = { homeScore: 1, awayScore: 0 }

    const anonymous = await client.put(url).json(score)
    const advisorSession = await client.put(url).cookies(advisor).json(score)

    anonymous.assertStatus(401)
    advisorSession.assertStatus(403)
    assert.equal(body(advisorSession).code, 'ACCESS_DENIED')
  })
})
