import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { scheduledMatch } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('matches > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('schedules date and place, and comes out with the teams and the bracket', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket, match } = await scheduledMatch()

    const response = await client
      .put(`/administrator/matches/${match.id}`)
      .cookies(admin)
      .json({ scheduledAt: '2026-11-03T14:30:00-03:00', location: 'Quadra coberta' })

    response.assertStatus(200)
    assert.equal(body(response).location, 'Quadra coberta')
    // Saved in UTC: 14:30 in Brasilia is 17:30.
    assert.equal(
      DateTime.fromISO(body(response).scheduledAt).toUTC().toISO(),
      '2026-11-03T17:30:00.000Z',
    )
    assert.isString(body(response).homeTeam.classroom.name)
    assert.equal(body(response).bracket.sport.id, bracket.sportId)
  })

  test('null unschedules, and the missing field stays as it was', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()
    match.merge({ scheduledAt: DateTime.now(), location: 'Ginásio' })
    await match.save()

    const response = await client
      .put(`/administrator/matches/${match.id}`)
      .cookies(admin)
      .json({ scheduledAt: null })

    response.assertStatus(200)
    assert.isNull(body(response).scheduledAt)
    assert.equal(body(response).location, 'Ginásio')
  })

  test('invalid date and too long place respond 422', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()

    const response = await client
      .put(`/administrator/matches/${match.id}`)
      .cookies(admin)
      .json({ scheduledAt: 'amanhã à tarde', location: 'x'.repeat(121) })

    response.assertStatus(422)
    assert.property(body(response).errors, 'scheduledAt')
    assert.property(body(response).errors, 'location')
  })

  test('date outside ISO 8601 with a time zone responds 422 and does not save', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()

    // `03/11/2026 14:30` became March 11 and `2026-11-03` became midnight
    // UTC through VineJS `iso8601`, which falls back to dayjs loose parsing.
    for (const scheduledAt of [
      '03/11/2026 14:30',
      '2026-11-03',
      '2026-11-03T14:30:00',
      '2026-13-03T14:30:00Z',
    ]) {
      const response = await client
        .put(`/administrator/matches/${match.id}`)
        .cookies(admin)
        .json({ scheduledAt })

      response.assertStatus(422)
      assert.property(body(response).errors, 'scheduledAt')
    }
    await match.refresh()
    assert.isNull(match.scheduledAt)
  })

  test('match that does not exist responds 404', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .put(`/administrator/matches/${randomUUID()}`)
      .cookies(admin)
      .json({ location: 'Quadra' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'MATCH_NOT_FOUND')
  })

  test('without a session is 401, and the advisor gets 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const url = `/administrator/matches/${randomUUID()}`

    const anonymous = await client.put(url).json({ location: 'Quadra' })
    const advisorSession = await client.put(url).cookies(advisor).json({ location: 'Quadra' })

    anonymous.assertStatus(401)
    advisorSession.assertStatus(403)
    assert.equal(body(advisorSession).code, 'ACCESS_DENIED')
  })
})
