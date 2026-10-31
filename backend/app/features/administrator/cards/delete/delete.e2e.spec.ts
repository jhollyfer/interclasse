import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { MatchCardFactory } from '#database/factories/match-card.factory'
import { Stored } from '#tests/stored-fixtures'
import { matchWithTeams } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

test.group('cards > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('deletes the card and responds 204', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { match, homeTeam, homeStudent } = await matchWithTeams()
    const card = await MatchCardFactory.merge({
      matchId: match.id,
      teamId: homeTeam.id,
      studentId: homeStudent.id,
      color: 'YELLOW',
    }).create()

    const response = await client.delete(`/administrator/cards/${card.id}`).cookies(session)

    response.assertStatus(204)
    assert.isNull(await Stored.card(card.id))
  })

  test('nonexistent card responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.delete(`/administrator/cards/${randomUUID()}`).cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'CARD_NOT_FOUND')
  })
})

test.group('administrator/cards/delete > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.delete(
      '/administrator/cards/00000000-0000-4000-8000-000000000000',
    )

    response.assertStatus(401)
  })

  test('403: advisor does not reach the organization route', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .delete('/administrator/cards/00000000-0000-4000-8000-000000000000')
      .cookies(advisor)

    response.assertStatus(403)
  })

  test('422: id that is not a uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete('/administrator/cards/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
  })
})
