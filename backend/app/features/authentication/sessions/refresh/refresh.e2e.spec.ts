import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#config/cookie'
import { authenticateAsAdministrator, resetDatabase } from '#tests/http-fixtures'

test.group('autenticação > refresh', (group) => {
  group.each.setup(() => resetDatabase())

  test('renova a sessão e devolve um par de tokens novo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.post('/authentication/refresh').cookies(session)

    response.assertStatus(204)
    assert.notEqual(response.cookie(COOKIE_TOKEN.ACCESS)?.value, session[COOKIE_TOKEN.ACCESS])
    assert.notEqual(response.cookie(COOKIE_TOKEN.REFRESH)?.value, session[COOKIE_TOKEN.REFRESH])
  })

  test('sem cookie de refresh responde 401', async ({ client }) => {
    const response = await client.post('/authentication/refresh')

    response.assertStatus(401)
  })
})
