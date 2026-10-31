import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { BRACKET_STATUS, MATCH_PHASE } from '@interclasse/shared'

import { drawnBracket, scheduledMatch } from '#tests/brackets-fixtures'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/http-fixtures'

test.group('storefront brackets > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('without a session, the bracket comes with the phases and the classroom names', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { sport, bracket } = await drawnBracket(client, admin, 2)

    const response = await client.get(`/storefront/brackets/${bracket.id}`)

    response.assertStatus(200)
    assert.equal(body(response).status, BRACKET_STATUS.KNOCKOUT)
    assert.deepEqual(body(response).sport, { id: sport.id, name: sport.name, slug: sport.slug })
    assert.isNull(body(response).championTeamId)
    // 2 classrooms: straight to the final.
    assert.lengthOf(body(response).matches, 1)
    const [final] = body(response).matches
    assert.equal(final.phase, MATCH_PHASE.FINAL)
    assert.isString(final.homeName)
    assert.isString(final.awayName)
    assert.isNull(final.scheduledAt)
  })

  test('the finished bracket shows the champion and the schedule in ISO', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket, away, match } = await scheduledMatch()
    const schedule = await client
      .put(`/administrator/matches/${match.id}`)
      .cookies(admin)
      .json({ scheduledAt: '2026-11-03T14:30:00-03:00', location: 'Quadra' })
    schedule.assertStatus(200)
    const score = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: 0, awayScore: 2 })
    score.assertStatus(200)

    const response = await client.get(`/storefront/brackets/${bracket.id}`)

    response.assertStatus(200)
    assert.equal(body(response).status, BRACKET_STATUS.FINISHED)
    assert.equal(body(response).championTeamId, away.id)
    assert.isString(body(response).matches[0].scheduledAt)
    assert.equal(body(response).matches[0].location, 'Quadra')
  })

  test('bracket that does not exist responds 404', async ({ client, assert }) => {
    const response = await client.get(`/storefront/brackets/${randomUUID()}`)

    response.assertStatus(404)
    assert.equal(body(response).code, 'BRACKET_NOT_FOUND')
  })

  test('id outside the uuid format responds 422', async ({ client, assert }) => {
    const response = await client.get('/storefront/brackets/nao-e-uuid')

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })
})
