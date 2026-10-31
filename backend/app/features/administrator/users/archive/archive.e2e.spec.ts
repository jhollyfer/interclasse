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
 * Archiving the account. Unlike the content resources, archiving here also
 * revokes the sessions, because the guard does not know `deleted_at` and without it
 * archiving would not switch anyone off.
 *
 * Restoring and deleting have a spec of their own action (`unarchive`, `delete`).
 */
test.group('users > archive', (group) => {
  group.each.setup(() => resetDatabase())

  test('archiving twice responds 409 USER_ALREADY_ARCHIVED on the second', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const first = await client.patch(`/administrator/users/${user.id}/archive`).cookies(session)
    first.assertStatus(204)

    const second = await client.patch(`/administrator/users/${user.id}/archive`).cookies(session)
    second.assertStatus(409)
    second.assertBodyContains({ code: 'USER_ALREADY_ARCHIVED' })
  })

  test('archiving revokes the account sessions', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const target = await authenticate(client, user.email, FACTORY_PASSWORD)

    const archiveResponse = await client
      .patch(`/administrator/users/${user.id}/archive`)
      .cookies(session)
    archiveResponse.assertStatus(204)

    const [{ count }] = await db
      .from('auth_access_tokens')
      .where('tokenable_id', user.id)
      .count('* as count')
    assert.equal(Number(count), 0)

    // Without a session, not without permission: the token ceased to exist, so whoever
    // arrives is nobody - 401, never 403.
    const after = await client.get('/account').cookies(target)
    after.assertStatus(401)
  })
})

test.group('administrator/users/archive > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('403: advisor does not reach the organization route', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .patch('/administrator/users/00000000-0000-4000-8000-000000000000/archive')
      .cookies(advisor)

    response.assertStatus(403)
  })

  test('422: id that is not a uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.patch('/administrator/users/nao-e-uuid/archive').cookies(admin)

    response.assertStatus(422)
  })
})
