import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { MATCH_PHASE } from '@interclasse/shared'

import { Stored } from '#tests/stored-fixtures'
import { drawnBracket, scoreAll } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('brackets > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('a bracket with a score cannot be deleted; without a score, it can', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket } = await drawnBracket(client, admin, 4)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.SEMI)

    const refusal = await client.delete(`/administrator/brackets/${bracket.id}`).cookies(admin)
    refusal.assertStatus(409)
    assert.equal(body(refusal).code, 'BRACKET_HAS_RESULTS')

    const played = body(await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin))
    for (const match of played.matches) {
      if (match.status !== 'FINISHED') continue
      const undo = await client.delete(`/administrator/matches/${match.id}/score`).cookies(admin)
      undo.assertStatus(200)
    }

    const deletion = await client.delete(`/administrator/brackets/${bracket.id}`).cookies(admin)
    deletion.assertStatus(204)
  })

  test('deleting takes teams and matches and reopens the enrollments', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { sport, classroomIds, bracket } = await drawnBracket(client, admin, 2)

    const response = await client.delete(`/administrator/brackets/${bracket.id}`).cookies(admin)

    response.assertStatus(204)
    const detail = await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin)
    detail.assertStatus(404)
    assert.lengthOf(await Stored.teamsOfBracket(bracket.id), 0)
    assert.lengthOf(await Stored.matchesOfBracket(bracket.id), 0)

    // Without the bracket, the classroom list accepts changes again.
    const enrollment = await client.put('/advisor/enrollments').cookies(admin).json({
      classroomId: classroomIds[0],
      sportId: sport.id,
      studentIds: [],
      reason: 'Refazer o sorteio',
    })
    enrollment.assertStatus(200)
  })

  test('bracket that does not exist responds 404', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete(`/administrator/brackets/${randomUUID()}`).cookies(admin)

    response.assertStatus(404)
    assert.equal(body(response).code, 'BRACKET_NOT_FOUND')
  })

  test('without a session is 401, and the advisor gets 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const url = `/administrator/brackets/${randomUUID()}`

    const anonymous = await client.delete(url)
    const advisorSession = await client.delete(url).cookies(advisor)

    anonymous.assertStatus(401)
    advisorSession.assertStatus(403)
    assert.equal(body(advisorSession).code, 'ACCESS_DENIED')
  })
})

test.group('administrator/brackets/delete > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('422: id that is not a uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete('/administrator/brackets/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
  })
})
