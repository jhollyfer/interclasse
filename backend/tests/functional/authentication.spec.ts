import { test } from '@japa/runner'
import { COOKIE_TOKEN } from '#services/cookie/cookie.service'
import { ADMINISTRATOR, authenticateAsAdministrator, body, resetDatabase } from '../helpers.ts'

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

/**
 * Sair tem de valer no servidor, e não só na tela.
 *
 * `backend-old` não tinha sign-out: o token era um JWT no corpo, guardado pelo
 * cliente, e "sair" era o navegador esquecê-lo - o token seguia válido até
 * vencer. Aqui o token é uma linha em `auth_access_tokens`, e apagá-la é o que
 * torna a sessão irrecuperável.
 */
test.group('autenticação > sign-out', (group) => {
  group.each.setup(() => resetDatabase())

  test('sign-out invalida a sessão em curso', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const saida = await client.post('/authentication/sign-out').cookies(session)

    saida.assertStatus(204)

    // O mesmo cookie de acesso, agora sem a linha que o sustentava.
    const repetida = await client.post('/authentication/sign-out').cookies(session)

    repetida.assertStatus(401)
  })
})

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
