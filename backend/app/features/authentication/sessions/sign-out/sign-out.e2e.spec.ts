import { test } from '@japa/runner'

import { authenticateAsAdministrator, resetDatabase } from '#tests/helpers'

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
