import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { StudentFactory } from '#database/factories/student.factory'
import { Stored } from '#tests/stored-fixtures'
import { matchWithTeams } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('cards > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('records the card on the athlete team and returns it with the match', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const { match, awayTeam, awayStudent } = await matchWithTeams()

    const response = await client
      .post('/administrator/cards')
      .cookies(session)
      .json({ matchId: match.id, studentId: awayStudent.id, color: 'YELLOW', note: 'Falta dura' })

    response.assertStatus(201)
    assert.equal(body(response).teamId, awayTeam.id)
    assert.equal(body(response).student.name, awayStudent.name)
    assert.equal(body(response).match.id, match.id)
    assert.lengthOf(await Stored.cards(), 1)
  })

  test('athlete from a classroom that does not play the match responds 422', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const { match } = await matchWithTeams()
    const intruder = await StudentFactory.with('classroom').create()

    const response = await client
      .post('/administrator/cards')
      .cookies(session)
      .json({ matchId: match.id, studentId: intruder.id, color: 'RED' })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STUDENT_NOT_IN_MATCH')
    assert.lengthOf(await Stored.cards(), 0)
  })

  test('nonexistent match responds 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { homeStudent } = await matchWithTeams()

    const response = await client
      .post('/administrator/cards')
      .cookies(session)
      .json({ matchId: randomUUID(), studentId: homeStudent.id, color: 'RED' })

    response.assertStatus(422)
    assert.equal(body(response).code, 'MATCH_NOT_FOUND')
  })

  test('advisor responds 403', async ({ client }) => {
    const session = await authenticateAsAdvisor(client)
    const { match, homeStudent } = await matchWithTeams()

    const response = await client
      .post('/administrator/cards')
      .cookies(session)
      .json({ matchId: match.id, studentId: homeStudent.id, color: 'RED' })

    response.assertStatus(403)
  })
})

test.group('administrator/cards/create > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.post('/administrator/cards')

    response.assertStatus(401)
  })
})
