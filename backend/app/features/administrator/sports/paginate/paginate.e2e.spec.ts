import { test } from '@japa/runner'

import { SportFactory } from '#database/factories/sport.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('sports > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('sem ?sort a lista sai em ordem alfabética, com meta', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await SportFactory.merge([
      { name: 'Vôlei' },
      { name: 'Futsal' },
      { name: 'Queimada' },
    ]).createMany(3)

    const response = await client.get('/administrator/sports').cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((sport: { name: string }) => sport.name),
      ['Futsal', 'Queimada', 'Vôlei'],
    )
    assert.equal(body(response).meta.total, 3)
    assert.equal(body(response).meta.perPage, 20)
    assert.equal(body(response).meta.currentPage, 1)
  })

  test('?sort e ?direction trocam a ordem', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await SportFactory.merge([{ name: 'Futsal' }, { name: 'Vôlei' }]).createMany(2)

    const response = await client
      .get('/administrator/sports')
      .qs({ sort: 'name', direction: 'desc' })
      .cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).data[0].name, 'Vôlei')
    assert.equal(body(response).data[1].name, 'Futsal')
  })

  test('?search recorta pelo nome, sem caixa', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const futsal = await SportFactory.merge({ name: 'Futsal' }).create()
    await SportFactory.merge({ name: 'Vôlei' }).create()

    const response = await client
      .get('/administrator/sports')
      .qs({ search: 'futs' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, futsal.id)
  })

  test('?perPage pagina a lista', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await SportFactory.createMany(3)

    const response = await client
      .get('/administrator/sports')
      .qs({ page: 2, perPage: 2 })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).meta.total, 3)
    assert.equal(body(response).meta.lastPage, 2)
  })

  test('?sort fora da tupla fechada responde 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    // Na URL, e não em `.qs()`: o registry do Tuyau não deixaria o valor
    // inválido compilar.
    const response = await client.get('/administrator/sports?sort=slug').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'sort')
  })

  test('sem sessão responde 401 e conselheiro responde 403', async ({ client, assert }) => {
    const anonymous = await client.get('/administrator/sports')
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client.get('/administrator/sports').cookies(advisor)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
  })
})
