import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import User from '#models/user'
import {
  ADMINISTRATOR,
  authenticateAsAdministrator,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

/**
 * A leitura da própria conta, e o que acontece com quem foi arquivado enquanto
 * ainda tinha token na mão.
 *
 * O guard confere assinatura e validade do token, e nada mais: ele não sabe que
 * a linha em `users` foi arquivada. Sem o scope `notDeleted` no use-case,
 * arquivar um usuário não teria efeito nenhum até o token vencer - até um dia
 * depois, pela validade do cookie de acesso.
 */
test.group('conta > leitura', (group) => {
  group.each.setup(() => resetDatabase())

  test('sessão válida responde 200 com o próprio usuário', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/account').cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).email, ADMINISTRATOR.email)
    assert.equal(body(response).role, 'ADMINISTRATOR')
    // A senha nunca sai na resposta: a coluna é `serializeAs: null`.
    assert.notProperty(body(response), 'password')
  })

  test('usuário arquivado com token ainda válido responde 401', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await User.findByOrFail('email', ADMINISTRATOR.email)

    await user.merge({ deletedAt: DateTime.now() }).save()

    const response = await client.get('/account').cookies(session)

    // 401 e não 404: o guard relê `deletedAt` e `status` a cada requisição,
    // então arquivar a conta encerra a sessão em vez de deixá-la autenticada
    // até o token vencer. O 404 anterior dizia "você está autenticado, mas a
    // sua própria conta não existe", que descrevia o buraco em vez da regra.
    response.assertStatus(401)
  })
})

/**
 * O `middleware.auth()` está no grupo `/account`, e não em cada rota. Este
 * teste é o que prova que ele está de fato ligado: sem ele, `context.auth.user!`
 * seria `undefined` e a leitura responderia 500 - ou pior, o `id` viria de
 * outro lugar.
 */
test.group('conta > sem sessão', () => {
  test('requisição sem cookie responde 401', async ({ client }) => {
    const leitura = await client.get('/account')
    const escrita = await client.put('/account').json({ name: 'Qualquer' })

    leitura.assertStatus(401)
    escrita.assertStatus(401)
  })
})
