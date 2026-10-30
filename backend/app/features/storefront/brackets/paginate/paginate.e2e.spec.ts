import { test } from '@japa/runner'
import { CATEGORY } from '@interclasse/shared'

import { BracketFactory } from '#database/factories/bracket.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { body, resetDatabase } from '#tests/http-fixtures'

test.group('storefront brackets > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('sem sessão, por modalidade e depois por categoria', async ({ client, assert }) => {
    const futsal = await SportFactory.merge({ name: 'Futsal', slug: 'futsal' }).create()
    const atletismo = await SportFactory.merge({ name: 'Atletismo', slug: 'atletismo' }).create()
    const futsalF2 = await BracketFactory.merge({
      sportId: futsal.id,
      category: CATEGORY.F2,
    }).create()
    const futsalF1 = await BracketFactory.merge({
      sportId: futsal.id,
      category: CATEGORY.F1,
    }).create()
    const atletismoF1 = await BracketFactory.merge({ sportId: atletismo.id }).create()

    const response = await client.get('/storefront/brackets')

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((bracket: { id: string }) => bracket.id),
      [atletismoF1.id, futsalF1.id, futsalF2.id],
    )
    assert.equal(body(response).data[0].sport.name, 'Atletismo')
    assert.equal(body(response).meta.total, 3)
  })

  test('?sportId e ?category recortam a lista', async ({ client, assert }) => {
    const sport = await SportFactory.create()
    const alvo = await BracketFactory.merge({ sportId: sport.id, category: CATEGORY.F2 }).create()
    await BracketFactory.merge({ sportId: sport.id, category: CATEGORY.F1 }).create()
    await BracketFactory.with('sport').merge({ category: CATEGORY.F2 }).create()

    const response = await client
      .get('/storefront/brackets')
      .qs({ sportId: sport.id, category: CATEGORY.F2 })

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, alvo.id)
  })

  test('?category fora da lista responde 422 apontando o campo', async ({ client, assert }) => {
    // Na URL, e não em `.qs()`: o registry do Tuyau tipa o valor pela lista fechada.
    const response = await client.get('/storefront/brackets?category=MEDIO')

    response.assertStatus(422)
    assert.property(body(response).errors, 'category')
  })
})
