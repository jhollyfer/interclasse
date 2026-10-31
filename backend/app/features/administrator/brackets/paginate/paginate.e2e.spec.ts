import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { BRACKET_STATUS, CATEGORY } from '@interclasse/shared'

import { BracketFactory } from '#database/factories/bracket.factory'
import { SportFactory } from '#database/factories/sport.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('brackets > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('the newest comes first, with the sport and the pagination', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const oldest = await BracketFactory.with('sport')
      .merge({ createdAt: DateTime.now().minus({ days: 1 }) })
      .create()
    const newer = await BracketFactory.with('sport').create()

    const response = await client.get('/administrator/brackets').cookies(admin)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((bracket: { id: string }) => bracket.id),
      [newer.id, oldest.id],
    )
    assert.equal(body(response).data[0].sport.id, newer.sportId)
    assert.equal(body(response).meta.total, 2)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('?sportId, ?category and ?status narrow the list', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await SportFactory.create()
    const target = await BracketFactory.merge({
      sportId: sport.id,
      category: CATEGORY.F2,
      status: BRACKET_STATUS.FINISHED,
    }).create()
    // One bracket per sport and category: the other category of the same
    // sport, and the same category of another sport, both in play.
    const otherCategory = await BracketFactory.merge({
      sportId: sport.id,
      category: CATEGORY.F1,
    }).create()
    const otherSport = await BracketFactory.with('sport').merge({ category: CATEGORY.F2 }).create()

    const ids = async (qs: Record<string, string>) => {
      const response = await client.get('/administrator/brackets').qs(qs).cookies(admin)
      response.assertStatus(200)

      return body(response)
        .data.map((bracket: { id: string }) => bracket.id)
        .sort()
    }

    assert.deepEqual(await ids({ sportId: sport.id }), [target.id, otherCategory.id].sort())
    assert.deepEqual(await ids({ category: CATEGORY.F2 }), [target.id, otherSport.id].sort())
    assert.deepEqual(await ids({ status: BRACKET_STATUS.FINISHED }), [target.id])
  })

  test('?status outside the list responds 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)

    // In the URL, not in `.qs()`: the Tuyau registry types the value by the closed list.
    const response = await client.get('/administrator/brackets?status=ARQUIVADA').cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'status')
  })

  test('without a session is 401, and the advisor gets 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)

    const anonymous = await client.get('/administrator/brackets')
    const advisorSession = await client.get('/administrator/brackets').cookies(advisor)

    anonymous.assertStatus(401)
    advisorSession.assertStatus(403)
    assert.equal(body(advisorSession).code, 'ACCESS_DENIED')
  })
})
