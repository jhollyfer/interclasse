import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import Sport from '#models/sport'
import { BracketFactory } from '#database/factories/bracket.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { enrollRoster } from '#tests/sports-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('sports > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('modalidade sem uso é apagada e responde 204', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.create()

    const response = await client.delete(`/administrator/sports/${sport.id}`).cookies(session)

    response.assertStatus(204)
    assert.isNull(await Sport.find(sport.id))
  })

  test('modalidade inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.delete(`/administrator/sports/${randomUUID()}`).cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'SPORT_NOT_FOUND')
  })

  test('modalidade com atleta inscrito responde 409 e fica', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.create()
    await enrollRoster(sport, 1)

    const response = await client.delete(`/administrator/sports/${sport.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'SPORT_IN_USE')
    assert.isNotNull(await Sport.find(sport.id))
  })

  test('modalidade com chave sorteada responde 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.create()
    await BracketFactory.merge({ sportId: sport.id }).create()

    const response = await client.delete(`/administrator/sports/${sport.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'SPORT_IN_USE')
    assert.isNotNull(await Sport.find(sport.id))
  })

  test('sem sessão responde 401 e conselheiro responde 403', async ({ client, assert }) => {
    const sport = await SportFactory.create()

    const anonymous = await client.delete(`/administrator/sports/${sport.id}`)
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client.delete(`/administrator/sports/${sport.id}`).cookies(advisor)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
    assert.isNotNull(await Sport.find(sport.id))
  })
})
