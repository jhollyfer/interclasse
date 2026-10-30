import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#services/cookie/cookie.service'
import { ADMINISTRATOR, body, resetDatabase } from '#tests/http-fixtures'

/**
 * A sessão inteira pelo caminho real: o sign-in é o único jeito de obter um
 * cookie válido, e todo outro teste da suíte depende dele.
 *
 * O que se afirma aqui é o contrato que `backend-old` não tinha: o token sai em
 * cookie `httpOnly` e não no corpo, e a recusa não conta se o e-mail
 * existe - senão o formulário de login vira um verificador de cadastro.
 */
test.group('autenticação > sign-in', (group) => {
  group.each.setup(() => resetDatabase())

  test('credencial correta responde 204 com os dois cookies', async ({ client, assert }) => {
    const response = await client.post('/authentication/sign-in').json(ADMINISTRATOR)

    response.assertStatus(204)

    // Sem corpo: o par de tokens viaja só no `Set-Cookie`, e o JavaScript da
    // página nunca o alcança.
    assert.isEmpty(response.text())
    assert.isDefined(response.cookie(COOKIE_TOKEN.ACCESS)?.value)
    assert.isDefined(response.cookie(COOKIE_TOKEN.REFRESH)?.value)
  })

  test('credencial errada responde 401 sem revelar se o e-mail existe', async ({
    client,
    assert,
  }) => {
    const existente = await client
      .post('/authentication/sign-in')
      .json({ email: ADMINISTRATOR.email, password: 'Errada1234!' })

    const inexistente = await client
      .post('/authentication/sign-in')
      .json({ email: 'ninguem@mail.com', password: 'Errada1234!' })

    existente.assertStatus(401)
    inexistente.assertStatus(401)

    // Mesma resposta nos dois casos: qualquer diferença - código, mensagem ou
    // campo apontado - transformaria o login num verificador de cadastro.
    assert.deepEqual(body(existente), body(inexistente))
    assert.equal(body(existente).code, 'INVALID_CREDENTIALS')

    // E nenhum cookie é escrito na recusa.
    assert.isUndefined(existente.cookie(COOKIE_TOKEN.ACCESS))
  })
})
