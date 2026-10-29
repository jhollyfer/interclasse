import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { scheduledMatch } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('matches > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('marca data e local, e sai com os times e a chave', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket, match } = await scheduledMatch()

    const response = await client
      .put(`/administrator/matches/${match.id}`)
      .cookies(admin)
      .json({ scheduledAt: '2026-11-03T14:30:00-03:00', location: 'Quadra coberta' })

    response.assertStatus(200)
    assert.equal(body(response).location, 'Quadra coberta')
    // Gravado em UTC: 14h30 em Brasília são 17h30.
    assert.equal(
      DateTime.fromISO(body(response).scheduledAt).toUTC().toISO(),
      '2026-11-03T17:30:00.000Z',
    )
    assert.isString(body(response).homeTeam.classroom.name)
    assert.equal(body(response).bracket.sport.id, bracket.sportId)
  })

  test('null desmarca, e o campo ausente fica como estava', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()
    match.merge({ scheduledAt: DateTime.now(), location: 'Ginásio' })
    await match.save()

    const response = await client
      .put(`/administrator/matches/${match.id}`)
      .cookies(admin)
      .json({ scheduledAt: null })

    response.assertStatus(200)
    assert.isNull(body(response).scheduledAt)
    assert.equal(body(response).location, 'Ginásio')
  })

  test('data inválida e local longo demais respondem 422', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()

    const response = await client
      .put(`/administrator/matches/${match.id}`)
      .cookies(admin)
      .json({ scheduledAt: 'amanhã à tarde', location: 'x'.repeat(121) })

    response.assertStatus(422)
    assert.property(body(response).errors, 'scheduledAt')
    assert.property(body(response).errors, 'location')
  })

  test('data fora de ISO 8601 com fuso responde 422 e não grava', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()

    // `03/11/2026 14:30` virava 11 de março e `2026-11-03` virava meia-noite
    // UTC pelo `iso8601` do VineJS, que cai no parse solto do dayjs.
    for (const scheduledAt of [
      '03/11/2026 14:30',
      '2026-11-03',
      '2026-11-03T14:30:00',
      '2026-13-03T14:30:00Z',
    ]) {
      const response = await client
        .put(`/administrator/matches/${match.id}`)
        .cookies(admin)
        .json({ scheduledAt })

      response.assertStatus(422)
      assert.property(body(response).errors, 'scheduledAt')
    }
    await match.refresh()
    assert.isNull(match.scheduledAt)
  })

  test('partida que não existe responde 404', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .put(`/administrator/matches/${randomUUID()}`)
      .cookies(admin)
      .json({ location: 'Quadra' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'MATCH_NOT_FOUND')
  })

  test('sem sessão é 401, e o conselheiro recebe 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const url = `/administrator/matches/${randomUUID()}`

    const anonimo = await client.put(url).json({ location: 'Quadra' })
    const conselheiro = await client.put(url).cookies(advisor).json({ location: 'Quadra' })

    anonimo.assertStatus(401)
    conselheiro.assertStatus(403)
    assert.equal(body(conselheiro).code, 'ACCESS_DENIED')
  })
})
