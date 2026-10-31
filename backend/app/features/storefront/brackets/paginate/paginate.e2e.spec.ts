import { test } from '@japa/runner'
import { CATEGORY } from '@interclasse/shared'

import { BracketFactory } from '#database/factories/bracket.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { body, resetDatabase } from '#tests/http-fixtures'

test.group('storefront brackets > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('without a session, by sport and then by category', async ({ client, assert }) => {
    const futsal = await SportFactory.merge({ name: 'Futsal', slug: 'futsal' }).create()
    const athletics = await SportFactory.merge({ name: 'Atletismo', slug: 'atletismo' }).create()
    const futsalF2 = await BracketFactory.merge({
      sportId: futsal.id,
      category: CATEGORY.F2,
    }).create()
    const futsalF1 = await BracketFactory.merge({
      sportId: futsal.id,
      category: CATEGORY.F1,
    }).create()
    const athleticsF1 = await BracketFactory.merge({ sportId: athletics.id }).create()

    const response = await client.get('/storefront/brackets')

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((bracket: { id: string }) => bracket.id),
      [athleticsF1.id, futsalF1.id, futsalF2.id],
    )
    assert.equal(body(response).data[0].sport.name, 'Atletismo')
    assert.equal(body(response).meta.total, 3)
  })

  test('?sportId and ?category narrow the list', async ({ client, assert }) => {
    const sport = await SportFactory.create()
    const target = await BracketFactory.merge({ sportId: sport.id, category: CATEGORY.F2 }).create()
    await BracketFactory.merge({ sportId: sport.id, category: CATEGORY.F1 }).create()
    await BracketFactory.with('sport').merge({ category: CATEGORY.F2 }).create()

    const response = await client
      .get('/storefront/brackets')
      .qs({ sportId: sport.id, category: CATEGORY.F2 })

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, target.id)
  })

  test('?category outside the list responds 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    // In the URL, not in `.qs()`: the Tuyau registry types the value by the closed list.
    const response = await client.get('/storefront/brackets?category=MEDIO')

    response.assertStatus(422)
    assert.property(body(response).errors, 'category')
  })
})
