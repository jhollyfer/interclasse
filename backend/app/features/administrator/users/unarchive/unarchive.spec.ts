import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import User from '#models/user'
import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user.factory'
import {
  authenticate,
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('users > unarchive', (group) => {
  group.each.setup(() => resetDatabase())

  test('tira da lixeira sem recriar sessão, e a conta volta a entrar', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const response = await client
      .patch(`/administrator/users/${user.id}/unarchive`)
      .cookies(session)

    response.assertStatus(204)
    const restored = await User.findOrFail(user.id)
    assert.isNull(restored.deletedAt)

    // Nenhum token nasce da restauração: quem volta entra pelo sign-in.
    const [{ count }] = await db
      .from('auth_access_tokens')
      .where('tokenable_id', user.id)
      .count('* as count')
    assert.equal(Number(count), 0)

    await authenticate(client, user.email, FACTORY_PASSWORD)

    const ver = await client.get(`/administrator/users/${user.id}`).cookies(session)
    ver.assertStatus(200)
  })

  test('restaurar usuário vivo responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const response = await client
      .patch(`/administrator/users/${user.id}/unarchive`)
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'USER_NOT_FOUND')
  })

  test('usuário inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .patch(`/administrator/users/${randomUUID()}/unarchive`)
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'USER_NOT_FOUND')
  })

  test('sem sessão responde 401, conselheiro responde 403', async ({ client, assert }) => {
    const user = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const anonymous = await client.patch(`/administrator/users/${user.id}/unarchive`)
    anonymous.assertStatus(401)

    const advisor = await authenticateAsAdvisor(client)
    const response = await client
      .patch(`/administrator/users/${user.id}/unarchive`)
      .cookies(advisor)

    response.assertStatus(403)
    assert.equal(body(response).code, 'ACCESS_DENIED')
    const archived = await User.findOrFail(user.id)
    assert.isNotNull(archived.deletedAt)
  })
})
