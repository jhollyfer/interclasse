import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import MatchCard from '#models/match-card'
import { matchWithTeams } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

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

test.group('administrator/cards/delete > acesso e validação', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: sem sessão', async ({ client }) => {
    const response = await client.delete(
      '/administrator/cards/00000000-0000-4000-8000-000000000000',
    )

    response.assertStatus(401)
  })

  test('403: conselheiro não alcança a rota da organização', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .delete('/administrator/cards/00000000-0000-4000-8000-000000000000')
      .cookies(advisor)

    response.assertStatus(403)
  })

  test('422: id que não é uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete('/administrator/cards/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
  })
})
