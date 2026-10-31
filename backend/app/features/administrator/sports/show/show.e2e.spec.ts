import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { SportFactory } from '#database/factories/sport.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('sports > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('returns the sport with the athlete limits', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.merge({ minAthletes: 3, maxAthletes: 9 }).create()

    const response = await client.get(`/administrator/sports/${sport.id}`).cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).id, sport.id)
    assert.equal(body(response).name, sport.name)
    assert.equal(body(response).slug, sport.slug)
    assert.equal(body(response).minAthletes, 3)
    assert.equal(body(response).maxAthletes, 9)
  })

  test('nonexistent sport responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get(`/administrator/sports/${randomUUID()}`).cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'SPORT_NOT_FOUND')
  })

  test('id that is not a uuid responds 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/sports/futsal').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })

  test('without a session responds 401 and advisor responds 403', async ({ client, assert }) => {
    const sport = await SportFactory.create()

    const anonymous = await client.get(`/administrator/sports/${sport.id}`)
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client.get(`/administrator/sports/${sport.id}`).cookies(advisor)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
  })
})
