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

  test('cria a modalidade com o slug tirado do nome', async ({ client, assert }) => {
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

  test('nome repetido responde 409 apontando o campo', async ({ client, assert }) => {
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

  test('nome diferente com o mesmo slug também é 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await SportFactory.merge({ name: 'Volei de Praia', slug: 'volei-de-praia' }).create()

    // Acento e caixa somem no slug: as duas modalidades disputariam o mesmo
    // endereço no site.
    const response = await client.post('/administrator/sports').cookies(session).json(payload)

    response.assertStatus(409)
    assert.equal(body(response).code, 'SPORT_ALREADY_EXISTS')
  })

  test('mínimo acima do máximo responde 422', async ({ client, assert }) => {
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

  test('payload sem os campos obrigatórios responde 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/sports')
      .cookies(session)
      .json({ name: '', minAthletes: 0, maxAthletes: 4 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'name')
    assert.property(body(response).errors, 'minAthletes')
  })

  test('sem sessão responde 401 e conselheiro responde 403', async ({ client, assert }) => {
    const anonymous = await client.post('/administrator/sports').json(payload)
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client.post('/administrator/sports').cookies(advisor).json(payload)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
  })
})
