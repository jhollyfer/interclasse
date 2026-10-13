import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { BRACKET_STATUS, MATCH_PHASE } from '#core/entity'
import { drawnBracket } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('brackets > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('a chave sai inteira, com a modalidade e o nome das turmas', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { sport, bracket } = await drawnBracket(client, admin, 4)

    const response = await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin)

    response.assertStatus(200)
    assert.equal(body(response).id, bracket.id)
    assert.equal(body(response).status, BRACKET_STATUS.KNOCKOUT)
    assert.equal(body(response).sport.id, sport.id)
    assert.isNull(body(response).championTeamId)
    // 4 turmas: duas semifinais e a final, na ordem de rodada e posição.
    assert.deepEqual(
      body(response).matches.map((match: { phase: string }) => match.phase),
      [MATCH_PHASE.SEMI, MATCH_PHASE.SEMI, MATCH_PHASE.FINAL],
    )
    const [semi] = body(response).matches
    assert.isString(semi.homeName)
    assert.isString(semi.awayName)
    assert.isNull(semi.homeScore)
  })

  test('chave que não existe responde 404', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get(`/administrator/brackets/${randomUUID()}`).cookies(admin)

    response.assertStatus(404)
    assert.equal(body(response).code, 'BRACKET_NOT_FOUND')
  })

  test('id fora do formato uuid responde 422', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/brackets/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })

  test('sem sessão é 401, e o conselheiro recebe 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const url = `/administrator/brackets/${randomUUID()}`

    const anonimo = await client.get(url)
    const conselheiro = await client.get(url).cookies(advisor)

    anonimo.assertStatus(401)
    conselheiro.assertStatus(403)
    assert.equal(body(conselheiro).code, 'ACCESS_DENIED')
  })
})
