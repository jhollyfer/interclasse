import { test } from '@japa/runner'

import { SportFactory } from '#database/factories/sport.factory'
import { body, resetDatabase } from '#tests/helpers'

test.group('sports > paginate (site)', (group) => {
  group.each.setup(() => resetDatabase())

  test('responde sem sessão, em ordem alfabética e com meta', async ({ client, assert }) => {
    await SportFactory.merge([
      { name: 'Vôlei' },
      { name: 'Futsal' },
      { name: 'Queimada' },
    ]).createMany(3)

    const response = await client.get('/storefront/sports')

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((sport: { name: string }) => sport.name),
      ['Futsal', 'Queimada', 'Vôlei'],
    )
    assert.equal(body(response).meta.total, 3)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('cada item traz o slug e os limites de atletas', async ({ client, assert }) => {
    const sport = await SportFactory.merge({ minAthletes: 5, maxAthletes: 12 }).create()

    const response = await client.get('/storefront/sports')

    response.assertStatus(200)
    assert.equal(body(response).data[0].id, sport.id)
    assert.equal(body(response).data[0].slug, sport.slug)
    assert.equal(body(response).data[0].minAthletes, 5)
    assert.equal(body(response).data[0].maxAthletes, 12)
  })

  test('?search recorta pelo nome', async ({ client, assert }) => {
    const futsal = await SportFactory.merge({ name: 'Futsal' }).create()
    await SportFactory.merge({ name: 'Vôlei' }).create()

    const response = await client.get('/storefront/sports').qs({ search: 'fut' })

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, futsal.id)
  })

  test('?perPage acima do teto responde 422', async ({ client, assert }) => {
    const response = await client.get('/storefront/sports').qs({ perPage: 101 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'perPage')
  })
})
