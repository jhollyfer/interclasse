import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user.factory'
import {
  authenticate,
  authenticateAsAdministrator,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

/**
 * Arquivar a conta. Diferente dos recursos de conteúdo, arquivar aqui também
 * revoga as sessões, porque o guard não conhece `deleted_at` e sem isso
 * arquivar não desligaria ninguém.
 *
 * Restaurar e apagar têm a spec da própria ação (`unarchive`, `delete`).
 */
test.group('users > archive', (group) => {
  group.each.setup(() => resetDatabase())

  test('arquivar duas vezes responde 409 USER_ALREADY_ARCHIVED na segunda', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const primeira = await client.patch(`/administrator/users/${user.id}/archive`).cookies(session)
    primeira.assertStatus(204)

    const segunda = await client.patch(`/administrator/users/${user.id}/archive`).cookies(session)
    segunda.assertStatus(409)
    segunda.assertBodyContains({ code: 'USER_ALREADY_ARCHIVED' })
  })

  test('arquivar revoga as sessões da conta', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const alvo = await authenticate(client, user.email, FACTORY_PASSWORD)

    const arquivar = await client.patch(`/administrator/users/${user.id}/archive`).cookies(session)
    arquivar.assertStatus(204)

    const [{ count }] = await db
      .from('auth_access_tokens')
      .where('tokenable_id', user.id)
      .count('* as count')
    assert.equal(Number(count), 0)

    // Sem sessão, e não sem permissão: o token deixou de existir, então quem
    // chega não é ninguém - 401, nunca 403.
    const depois = await client.get('/account').cookies(alvo)
    depois.assertStatus(401)
  })
})

test.group('administrator/users/archive > acesso e validação', (group) => {
  group.each.setup(() => resetDatabase())

  test('403: conselheiro não alcança a rota da organização', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .patch('/administrator/users/00000000-0000-4000-8000-000000000000/archive')
      .cookies(advisor)

    response.assertStatus(403)
  })

  test('422: id que não é uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.patch('/administrator/users/nao-e-uuid/archive').cookies(admin)

    response.assertStatus(422)
  })
})
