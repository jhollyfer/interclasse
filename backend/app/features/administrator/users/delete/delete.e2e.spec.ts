import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { USER_ROLE } from '@interclasse/shared'

import { Stored } from '#tests/stored-fixtures'
import { StorageFactory } from '#database/factories/storage.factory'
import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user.factory'
import {
  ADMINISTRATOR,
  authenticate,
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

/**
 * The creation payload. `passwordConfirmation` accompanies the password because the shared
 * strength rule requires `confirmed` - the field is read from the raw input and does not
 * reach the database.
 */
const payload = {
  name: 'Nova Pessoa',
  email: 'nova.pessoa@mail.com',
  password: 'Demo1234!',
  passwordConfirmation: 'Demo1234!',
  role: USER_ROLE.ADVISOR,
}

test.group('users > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('deleting without archiving responds 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const response = await client.delete(`/administrator/users/${user.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_NOT_ARCHIVED')
    assert.isNotNull(await Stored.user(user.id))
  })

  test('deleting an archived user responds 204 and takes the tokens along', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const avatar = await StorageFactory.create()
    const user = await UserFactory.merge({ avatarId: avatar.id }).create()

    // A live token before archiving, to prove the purge `CASCADE`.
    await authenticate(client, user.email, FACTORY_PASSWORD)
    await Stored.issueToken(user)

    const archiveResponse = await client
      .patch(`/administrator/users/${user.id}/archive`)
      .cookies(session)
    archiveResponse.assertStatus(204)

    const response = await client.delete(`/administrator/users/${user.id}`).cookies(session)

    response.assertStatus(204)
    assert.isNull(await Stored.user(user.id))

    const [{ count }] = await db
      .from('auth_access_tokens')
      .where('tokenable_id', user.id)
      .count('* as count')
    assert.equal(Number(count), 0)
    // The file stays: the key is `SET NULL` and the binary is neutral.
    assert.isNotNull(await Stored.storage(avatar.id))
  })

  test('nonexistent user responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.delete(`/administrator/users/${randomUUID()}`).cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'USER_NOT_FOUND')
  })

  test('the own account responds 403 before the archiving requirement', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const self = await Stored.userByEmailOrFail(ADMINISTRATOR.email)

    const response = await client.delete(`/administrator/users/${self.id}`).cookies(session)

    // 403 and not 409: the rule that protects is the own account one, not the record state.
    response.assertStatus(403)
    assert.equal(body(response).code, 'SELF_DELETE_FORBIDDEN')
    assert.isNotNull(await Stored.user(self.id))
  })

  test('without a session responds 401, advisor responds 403', async ({ client, assert }) => {
    const user = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const anonymous = await client.delete(`/administrator/users/${user.id}`)
    anonymous.assertStatus(401)

    const advisor = await authenticateAsAdvisor(client)
    const response = await client.delete(`/administrator/users/${user.id}`).cookies(advisor)

    response.assertStatus(403)
    assert.equal(body(response).code, 'ACCESS_DENIED')
    assert.isNotNull(await Stored.user(user.id))
  })

  test('the full journey closes: create, archive, restore, archive and delete', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const created = await client.post('/administrator/users').cookies(session).json(payload)
    created.assertStatus(201)

    const id = body(created).id

    const archived = await client.patch(`/administrator/users/${id}/archive`).cookies(session)
    archived.assertStatus(204)

    // Out of the default listings, inside `?trashed=only`.
    const trash = await client.get('/administrator/users').qs({ trashed: 'only' }).cookies(session)

    trash.assertStatus(200)
    assert.lengthOf(body(trash).data, 1)

    const restored = await client.patch(`/administrator/users/${id}/unarchive`).cookies(session)
    restored.assertStatus(204)

    const view = await client.get(`/administrator/users/${id}`).cookies(session)
    view.assertStatus(200)

    const again = await client.patch(`/administrator/users/${id}/archive`).cookies(session)
    again.assertStatus(204)

    const deleted = await client.delete(`/administrator/users/${id}`).cookies(session)
    deleted.assertStatus(204)

    assert.isNull(await Stored.user(id))
  })
})

test.group('administrator/users/delete > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('422: id that is not a uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete('/administrator/users/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
  })
})
