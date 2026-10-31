import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import { drawnBracket, scheduledMatch, scoreAll } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('matches > unscore', (group) => {
  group.each.setup(() => resetDatabase())

  test('a wrong score is undone, and the undone final reopens the bracket', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket } = await drawnBracket(client, admin, 4)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.SEMI)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.FINAL)

    const played = body(await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin))
    const semi = played.matches.find((match: { phase: string }) => match.phase === MATCH_PHASE.SEMI)
    const final = played.matches.find(
      (match: { phase: string }) => match.phase === MATCH_PHASE.FINAL,
    )

    // The semifinal does not leave while the final, which depends on it, has a score.
    const early = await client.delete(`/administrator/matches/${semi.id}/score`).cookies(admin)
    early.assertStatus(409)
    assert.equal(body(early).code, 'NEXT_MATCH_PLAYED')

    const undoFinal = await client.delete(`/administrator/matches/${final.id}/score`).cookies(admin)
    undoFinal.assertStatus(200)
    assert.equal(body(undoFinal).status, 'SCHEDULED')

    const undoSemi = await client.delete(`/administrator/matches/${semi.id}/score`).cookies(admin)
    undoSemi.assertStatus(200)

    const after = body(await client.get(`/storefront/brackets/${bracket.id}`))
    const finalAfter = after.matches.find(
      (match: { phase: string }) => match.phase === MATCH_PHASE.FINAL,
    )
    assert.equal(after.status, 'KNOCKOUT')
    assert.isNull(after.championTeamId)
    // The winner of the undone semifinal left its slot in the final.
    assert.isTrue(finalAfter.homeTeamId === null || finalAfter.awayTeamId === null)

    const again = await client.delete(`/administrator/matches/${semi.id}/score`).cookies(admin)
    again.assertStatus(409)
    assert.equal(body(again).code, 'MATCH_NOT_PLAYED')
  })

  test('the match returns without a score and comes out with the teams and the bracket', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket, match } = await scheduledMatch()
    const score = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: 2, awayScore: 0 })
    score.assertStatus(200)

    const response = await client.delete(`/administrator/matches/${match.id}/score`).cookies(admin)

    response.assertStatus(200)
    assert.equal(body(response).status, MATCH_STATUS.SCHEDULED)
    assert.isNull(body(response).homeScore)
    assert.isNull(body(response).awayScore)
    assert.isNull(body(response).winnerTeamId)
    assert.isString(body(response).awayTeam.classroom.name)
    assert.equal(body(response).bracket.sport.id, bracket.sportId)
  })

  test('match without a score responds 409', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()

    const response = await client.delete(`/administrator/matches/${match.id}/score`).cookies(admin)

    response.assertStatus(409)
    assert.equal(body(response).code, 'MATCH_NOT_PLAYED')
  })

  test('match that does not exist responds 404', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .delete(`/administrator/matches/${randomUUID()}/score`)
      .cookies(admin)

    response.assertStatus(404)
    assert.equal(body(response).code, 'MATCH_NOT_FOUND')
  })

  test('without a session is 401, and the advisor gets 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const url = `/administrator/matches/${randomUUID()}/score`

    const anonymous = await client.delete(url)
    const advisorSession = await client.delete(url).cookies(advisor)

    anonymous.assertStatus(401)
    advisorSession.assertStatus(403)
    assert.equal(body(advisorSession).code, 'ACCESS_DENIED')
  })
})
