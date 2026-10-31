import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { BracketFactory } from '#database/factories/bracket.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { Stored } from '#tests/stored-fixtures'
import { enrollRoster } from '#tests/sports-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('sports > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('unused sport is deleted and responds 204', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.create()

    const response = await client.delete(`/administrator/sports/${sport.id}`).cookies(session)

    response.assertStatus(204)
    assert.isNull(await Stored.sport(sport.id))
  })

  test('nonexistent sport responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.delete(`/administrator/sports/${randomUUID()}`).cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'SPORT_NOT_FOUND')
  })

  test('sport with an enrolled athlete responds 409 and stays', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.create()
    await enrollRoster(sport, 1)

    const response = await client.delete(`/administrator/sports/${sport.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'SPORT_IN_USE')
    assert.isNotNull(await Stored.sport(sport.id))
  })

  test('sport with a drawn bracket responds 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.create()
    await BracketFactory.merge({ sportId: sport.id }).create()

    const response = await client.delete(`/administrator/sports/${sport.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'SPORT_IN_USE')
    assert.isNotNull(await Stored.sport(sport.id))
  })

  test('without a session responds 401 and advisor responds 403', async ({ client, assert }) => {
    const sport = await SportFactory.create()

    const anonymous = await client.delete(`/administrator/sports/${sport.id}`)
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client.delete(`/administrator/sports/${sport.id}`).cookies(advisor)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
    assert.isNotNull(await Stored.sport(sport.id))
  })
})

test.group('administrator/sports/delete > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('422: id that is not a uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete('/administrator/sports/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
  })
})
