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

  test('a mais nova vem primeiro, com a modalidade e a paginação', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const antiga = await BracketFactory.with('sport')
      .merge({ createdAt: DateTime.now().minus({ days: 1 }) })
      .create()
    const nova = await BracketFactory.with('sport').create()

    const response = await client.get('/administrator/brackets').cookies(admin)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((bracket: { id: string }) => bracket.id),
      [nova.id, antiga.id],
    )
    assert.equal(body(response).data[0].sport.id, nova.sportId)
    assert.equal(body(response).meta.total, 2)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('?sportId, ?category e ?status recortam a lista', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await SportFactory.create()
    const alvo = await BracketFactory.merge({
      sportId: sport.id,
      category: CATEGORY.F2,
      status: BRACKET_STATUS.FINISHED,
    }).create()
    // Uma chave por modalidade e categoria: a outra categoria da mesma
    // modalidade, e a mesma categoria de outra modalidade, ambas em disputa.
    const outraCategoria = await BracketFactory.merge({
      sportId: sport.id,
      category: CATEGORY.F1,
    }).create()
    const outraModalidade = await BracketFactory.with('sport')
      .merge({ category: CATEGORY.F2 })
      .create()

    const ids = async (qs: Record<string, string>) => {
      const response = await client.get('/administrator/brackets').qs(qs).cookies(admin)
      response.assertStatus(200)

      return body(response)
        .data.map((bracket: { id: string }) => bracket.id)
        .sort()
    }

    assert.deepEqual(await ids({ sportId: sport.id }), [alvo.id, outraCategoria.id].sort())
    assert.deepEqual(await ids({ category: CATEGORY.F2 }), [alvo.id, outraModalidade.id].sort())
    assert.deepEqual(await ids({ status: BRACKET_STATUS.FINISHED }), [alvo.id])
  })

  test('?status fora da lista responde 422 apontando o campo', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    // Na URL, e não em `.qs()`: o registry do Tuyau tipa o valor pela lista fechada.
    const response = await client.get('/administrator/brackets?status=ARQUIVADA').cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'status')
  })

  test('sem sessão é 401, e o conselheiro recebe 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)

    const anonimo = await client.get('/administrator/brackets')
    const conselheiro = await client.get('/administrator/brackets').cookies(advisor)

    anonimo.assertStatus(401)
    conselheiro.assertStatus(403)
    assert.equal(body(conselheiro).code, 'ACCESS_DENIED')
  })
})
