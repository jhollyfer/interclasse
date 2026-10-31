import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { matchWithTeams } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

test.group('matches > athletes', (group) => {
  group.each.setup(() => resetDatabase())

  test('returns the students of both classrooms, with the enrolled marked', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const { bracket, match, homeTeam, homeStudent, awayStudent } = await matchWithTeams()
    await EnrollmentFactory.merge({ studentId: homeStudent.id, sportId: bracket.sportId }).create()

    const response = await client
      .get(`/administrator/matches/${match.id}/athletes`)
      .cookies(session)

    response.assertStatus(200)
    const [home, away] = body(response).teams
    assert.equal(home.teamId, homeTeam.id)
    assert.deepEqual(home.students, [
      { id: homeStudent.id, name: homeStudent.name, enrolled: true },
    ])
    assert.deepEqual(away.students, [
      { id: awayStudent.id, name: awayStudent.name, enrolled: false },
    ])
  })

  test('nonexistent match responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .get(`/administrator/matches/${randomUUID()}/athletes`)
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'MATCH_NOT_FOUND')
  })
})

test.group('administrator/matches/athletes > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.get(
      '/administrator/matches/00000000-0000-4000-8000-000000000000/athletes',
    )

    response.assertStatus(401)
  })

  test('403: advisor does not reach the organization route', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .get('/administrator/matches/00000000-0000-4000-8000-000000000000/athletes')
      .cookies(advisor)

    response.assertStatus(403)
  })
})

test.group('administrator/matches/athletes > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('malformed match id responds 422 instead of a Postgres 500', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/matches/x/athletes').cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })
})
