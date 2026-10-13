import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#services/cookie/cookie.service'
import { authenticateAsAdministrator, resetDatabase } from '#tests/helpers'

/**
 * O guard confere o `name` do token, e não só a assinatura.
 *
 * Os dois tokens saem do mesmo `DbAccessTokensProvider` e são indistinguíveis
 * pela verificação: sem esta conferência, apresentar o de refresh como token de
 * acesso daria uma sessão de sete dias onde o contrato promete um.
 */
test.group('autenticação > refresh', (group) => {
  group.each.setup(() => resetDatabase())

  test('renova a sessão e devolve um par de tokens novo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.post('/authentication/refresh').cookies(session)

    response.assertStatus(204)
    assert.notEqual(response.cookie(COOKIE_TOKEN.ACCESS)?.value, session[COOKIE_TOKEN.ACCESS])
    assert.notEqual(response.cookie(COOKIE_TOKEN.REFRESH)?.value, session[COOKIE_TOKEN.REFRESH])
  })

  test('token de refresh apresentado como token de acesso responde 401', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.post('/authentication/sign-out').cookies({
      [COOKIE_TOKEN.ACCESS]: session[COOKIE_TOKEN.REFRESH],
    })

    response.assertStatus(401)
  })

  test('sem cookie de refresh responde 401', async ({ client }) => {
    const response = await client.post('/authentication/refresh')

    response.assertStatus(401)
  })
})
