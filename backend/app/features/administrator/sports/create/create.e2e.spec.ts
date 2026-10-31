import { test } from '@japa/runner'

import { Stored } from '#tests/stored-fixtures'
import { SportFactory } from '#database/factories/sport.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

const payload = { name: 'Vôlei de Praia', minAthletes: 2, maxAthletes: 4 }

test.group('sports > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('creates the sport with the slug taken from the name', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.post('/administrator/sports').cookies(session).json(payload)

    response.assertStatus(201)
    assert.isString(body(response).id)
    assert.equal(body(response).name, payload.name)
    assert.equal(body(response).slug, 'volei-de-praia')
    assert.equal(body(response).minAthletes, 2)
    assert.equal(body(response).maxAthletes, 4)
    assert.isNotNull(await Stored.sport(body(response).id))
  })

  test('repeated name responds 409 pointing at the field', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const existing = await SportFactory.create()

    const response = await client
      .post('/administrator/sports')
      .cookies(session)
      .json({ ...payload, name: existing.name })

    response.assertStatus(409)
    assert.equal(body(response).code, 'SPORT_ALREADY_EXISTS')
    assert.property(body(response).errors, 'name')
  })

  test('different name with the same slug is also 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await SportFactory.merge({ name: 'Volei de Praia', slug: 'volei-de-praia' }).create()

    // Accent and case vanish in the slug: both sports would compete for the same
    // address on the site.
    const response = await client.post('/administrator/sports').cookies(session).json(payload)

    response.assertStatus(409)
    assert.equal(body(response).code, 'SPORT_ALREADY_EXISTS')
  })

  test('minimum above the maximum responds 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/sports')
      .cookies(session)
      .json({ ...payload, minAthletes: 5, maxAthletes: 4 })

    response.assertStatus(422)
    assert.equal(body(response).code, 'SPORT_INVALID_LIMITS')
    assert.property(body(response).errors, 'minAthletes')
    assert.isNull(await Stored.sportByName(payload.name))
  })

  test('payload without the required fields responds 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/sports')
      .cookies(session)
      .json({ name: '', minAthletes: 0, maxAthletes: 4 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'name')
    assert.property(body(response).errors, 'minAthletes')
  })

  test('without a session responds 401 and advisor responds 403', async ({ client, assert }) => {
    const anonymous = await client.post('/administrator/sports').json(payload)
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client.post('/administrator/sports').cookies(advisor).json(payload)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
  })
})
