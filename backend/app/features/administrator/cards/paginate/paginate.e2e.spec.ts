import { test } from '@japa/runner'

import { MatchCardFactory } from '#database/factories/match-card.factory'
import { matchWithTeams } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

test.group('cards > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('lists the cards and filters by classroom', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { match, home, homeTeam, awayTeam, homeStudent, awayStudent } = await matchWithTeams()
    await MatchCardFactory.merge([
      { matchId: match.id, teamId: homeTeam.id, studentId: homeStudent.id, color: 'YELLOW' },
      { matchId: match.id, teamId: awayTeam.id, studentId: awayStudent.id, color: 'RED' },
    ]).createMany(2)

    const all = await client.get('/administrator/cards').cookies(session)
    const filtered = await client
      .get('/administrator/cards')
      .qs({ classroomId: home.id })
      .cookies(session)

    all.assertStatus(200)
    assert.equal(body(all).meta.total, 2)
    filtered.assertStatus(200)
    assert.equal(body(filtered).meta.total, 1)
    assert.equal(body(filtered).data[0].student.id, homeStudent.id)
    assert.equal(body(filtered).data[0].team.classroom.name, home.name)
  })
})

test.group('administrator/cards/paginate > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.get('/administrator/cards')

    response.assertStatus(401)
  })

  test('403: advisor does not reach the organization route', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/cards').cookies(advisor)

    response.assertStatus(403)
  })
})

test.group('administrator/cards/paginate > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('malformed classroom filter responds 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .get('/administrator/cards')
      .qs({ classroomId: 'x' })
      .cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'classroomId')
  })
})
