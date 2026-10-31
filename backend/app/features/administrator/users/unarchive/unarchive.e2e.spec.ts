import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { Stored } from '#tests/stored-fixtures'
import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user.factory'
import {
  authenticate,
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('users > unarchive', (group) => {
  group.each.setup(() => resetDatabase())

  test('takes out of the trash without recreating a session, and the account can sign in again', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const response = await client
      .patch(`/administrator/users/${user.id}/unarchive`)
      .cookies(session)

    response.assertStatus(204)
    const restored = await Stored.userOrFail(user.id)
    assert.isNull(restored.deletedAt)

    // No token is born from the restoration: whoever returns signs in through sign-in.
    const [{ count }] = await db
      .from('auth_access_tokens')
      .where('tokenable_id', user.id)
      .count('* as count')
    assert.equal(Number(count), 0)

    await authenticate(client, user.email, FACTORY_PASSWORD)

    const view = await client.get(`/administrator/users/${user.id}`).cookies(session)
    view.assertStatus(200)
  })

  test('restoring a live user responds 409 USER_NOT_ARCHIVED', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const response = await client
      .patch(`/administrator/users/${user.id}/unarchive`)
      .cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_NOT_ARCHIVED')
  })

  test('nonexistent user responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .patch(`/administrator/users/${randomUUID()}/unarchive`)
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'USER_NOT_FOUND')
  })

  test('without a session responds 401, advisor responds 403', async ({ client, assert }) => {
    const user = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const anonymous = await client.patch(`/administrator/users/${user.id}/unarchive`)
    anonymous.assertStatus(401)

    const advisor = await authenticateAsAdvisor(client)
    const response = await client
      .patch(`/administrator/users/${user.id}/unarchive`)
      .cookies(advisor)

    response.assertStatus(403)
    assert.equal(body(response).code, 'ACCESS_DENIED')
    const archived = await Stored.userOrFail(user.id)
    assert.isNotNull(archived.deletedAt)
  })
})

test.group('administrator/users/unarchive > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('422: id that is not a uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.patch('/administrator/users/nao-e-uuid/unarchive').cookies(admin)

    response.assertStatus(422)
  })
})
