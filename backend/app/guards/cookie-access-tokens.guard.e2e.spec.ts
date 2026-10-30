import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#config/cookie'
import { ADMINISTRATOR, authenticateAsAdministrator, resetDatabase } from '#tests/http-fixtures'
import { findUserByEmail } from '#tests/users-fixtures'

/**
 * O guard confere o `name` do token, e não só a assinatura.
 *
 * Os dois tokens saem do mesmo `DbAccessTokensProvider` e são indistinguíveis
 * pela verificação: sem esta conferência, apresentar o de refresh como token de
 * acesso daria uma sessão de sete dias onde o contrato promete um.
 */
test.group('guards > cookie-access-tokens', (group) => {
  group.each.setup(() => resetDatabase())

  test('token de acesso válido autentica', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/account').cookies(session)

    response.assertStatus(200)
  })

  test('sem cookie responde 401', async ({ client }) => {
    const response = await client.get('/account')

    response.assertStatus(401)
  })

  test('token de refresh apresentado como token de acesso responde 401', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/account').cookies({
      [COOKIE_TOKEN.ACCESS]: session[COOKIE_TOKEN.REFRESH],
    })

    response.assertStatus(401)
  })

  test('token que não existe responde 401', async ({ client }) => {
    const response = await client.get('/account').cookies({
      [COOKIE_TOKEN.ACCESS]: 'oat_abc.def',
    })

    response.assertStatus(401)
  })

  test('conta desativada perde o acesso na requisição seguinte', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await findUserByEmail(ADMINISTRATOR.email)
    user.status = 'INACTIVE'
    await user.save()

    const response = await client.get('/account').cookies(session)

    response.assertStatus(401)
  })
})
