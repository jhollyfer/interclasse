import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import Sport from '#models/sport'
import { SportFactory } from '#database/factories/sport.factory'
import { enrollRoster } from '#tests/sports-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('sports > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('trocar o nome troca o slug e mantém o resto', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.merge({ minAthletes: 2, maxAthletes: 8 }).create()

    const response = await client
      .put(`/administrator/sports/${sport.id}`)
      .cookies(session)
      .json({ name: 'Tênis de Mesa' })

    response.assertStatus(200)
    assert.equal(body(response).id, sport.id)
    assert.equal(body(response).name, 'Tênis de Mesa')
    assert.equal(body(response).slug, 'tenis-de-mesa')
    assert.equal(body(response).minAthletes, 2)
    assert.equal(body(response).maxAthletes, 8)
  })

  test('manter o próprio nome não é conflito', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.create()

    const response = await client
      .put(`/administrator/sports/${sport.id}`)
      .cookies(session)
      .json({ name: sport.name, maxAthletes: 12 })

    response.assertStatus(200)
    assert.equal(body(response).slug, sport.slug)
    assert.equal(body(response).maxAthletes, 12)
  })

  test('modalidade inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put(`/administrator/sports/${randomUUID()}`)
      .cookies(session)
      .json({ name: 'Qualquer' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'SPORT_NOT_FOUND')
  })

  test('nome de outra modalidade responde 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const other = await SportFactory.create()
    const sport = await SportFactory.create()

    const response = await client
      .put(`/administrator/sports/${sport.id}`)
      .cookies(session)
      .json({ name: other.name })

    response.assertStatus(409)
    assert.equal(body(response).code, 'SPORT_ALREADY_EXISTS')
    assert.property(body(response).errors, 'name')
  })

  test('o limite parcial é conferido contra o valor gravado', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.merge({ minAthletes: 5, maxAthletes: 10 }).create()

    // Só o máximo vem no payload; o mínimo de 5 gravado passa a ficar acima dele.
    const response = await client
      .put(`/administrator/sports/${sport.id}`)
      .cookies(session)
      .json({ maxAthletes: 4 })

    response.assertStatus(422)
    assert.equal(body(response).code, 'SPORT_INVALID_LIMITS')
    assert.property(body(response).errors, 'minAthletes')
    const stored = await Sport.findOrFail(sport.id)
    assert.equal(stored.maxAthletes, 10)
  })

  test('máximo abaixo de uma lista já inscrita responde 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.merge({ minAthletes: 1, maxAthletes: 10 }).create()
    await enrollRoster(sport, 5)

    const below = await client
      .put(`/administrator/sports/${sport.id}`)
      .cookies(session)
      .json({ maxAthletes: 4 })
    const exact = await client
      .put(`/administrator/sports/${sport.id}`)
      .cookies(session)
      .json({ maxAthletes: 5 })

    below.assertStatus(409)
    assert.equal(body(below).code, 'SPORT_ROSTER_ABOVE_LIMIT')
    assert.property(body(below).errors, 'maxAthletes')
    exact.assertStatus(200)
    assert.equal(body(exact).maxAthletes, 5)
  })

  test('sem sessão responde 401 e conselheiro responde 403', async ({ client, assert }) => {
    const sport = await SportFactory.create()

    const anonymous = await client.put(`/administrator/sports/${sport.id}`).json({ name: 'X' })
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client
      .put(`/administrator/sports/${sport.id}`)
      .cookies(advisor)
      .json({ name: 'X' })

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
  })

  test('nome vazio ou limite nulo responde 422 e não grava', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.create()

    for (const payload of [{ name: '' }, { maxAthletes: null }]) {
      const response = await client
        .put(`/administrator/sports/${sport.id}`)
        .cookies(session)
        .json(payload)

      response.assertStatus(422)
    }
    const stored = await Sport.findOrFail(sport.id)
    assert.equal(stored.name, sport.name)
    assert.equal(stored.maxAthletes, sport.maxAthletes)
  })
})
