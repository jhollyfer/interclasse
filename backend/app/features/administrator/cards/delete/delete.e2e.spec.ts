import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import MatchCard from '#models/match-card'
import { matchWithTeams } from '#tests/classrooms-fixtures'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/helpers'

test.group('cards > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('apaga o cartão e responde 204', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { match, homeTeam, homeStudent } = await matchWithTeams()
    const card = await MatchCard.create({
      matchId: match.id,
      teamId: homeTeam.id,
      studentId: homeStudent.id,
      color: 'YELLOW',
    })

    const response = await client.delete(`/administrator/cards/${card.id}`).cookies(session)

    response.assertStatus(204)
    assert.isNull(await MatchCard.find(card.id))
  })

  test('cartão inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.delete(`/administrator/cards/${randomUUID()}`).cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'CARD_NOT_FOUND')
  })
})
