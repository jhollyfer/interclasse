import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { BRACKET_STATUS, MATCH_PHASE } from '@interclasse/shared'

import { drawnBracket } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('brackets > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('the bracket comes out whole, with the sport and the classroom names', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { sport, bracket } = await drawnBracket(client, admin, 4)

    const response = await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin)

    response.assertStatus(200)
    assert.equal(body(response).id, bracket.id)
    assert.equal(body(response).status, BRACKET_STATUS.KNOCKOUT)
    assert.equal(body(response).sport.id, sport.id)
    assert.isNull(body(response).championTeamId)
    // 4 classrooms: two semifinals and the final, in round and position order.
    assert.deepEqual(
      body(response).matches.map((match: { phase: string }) => match.phase),
      [MATCH_PHASE.SEMI, MATCH_PHASE.SEMI, MATCH_PHASE.FINAL],
    )
    const [semi] = body(response).matches
    assert.isString(semi.homeName)
    assert.isString(semi.awayName)
    assert.isNull(semi.homeScore)
  })

  test('bracket that does not exist responds 404', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get(`/administrator/brackets/${randomUUID()}`).cookies(admin)

    response.assertStatus(404)
    assert.equal(body(response).code, 'BRACKET_NOT_FOUND')
  })

  test('id outside the uuid format responds 422', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/brackets/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })

  test('without a session is 401, and the advisor gets 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const url = `/administrator/brackets/${randomUUID()}`

    const anonymous = await client.get(url)
    const advisorSession = await client.get(url).cookies(advisor)

    anonymous.assertStatus(401)
    advisorSession.assertStatus(403)
    assert.equal(body(advisorSession).code, 'ACCESS_DENIED')
  })
})
