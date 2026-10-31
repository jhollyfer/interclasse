import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { USER_ROLE } from '@interclasse/shared'

import { UserFactory } from '#database/factories/user.factory'
import {
  ADMINISTRATOR,
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

/** An already confirmed file, which is the only state `assertExist` accepts. */

test.group('administrator > users > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('partial payload does not erase the missing field', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.merge({ name: 'Original' }).create()

    const response = await client
      .put(`/administrator/users/${user.id}`)
      .cookies(session)
      .json({ name: 'Editado' })

    response.assertStatus(200)
    assert.equal(body(response).name, 'Editado')
    assert.equal(body(response).email, user.email)
    assert.equal(body(response).role, USER_ROLE.ADVISOR)
    assert.notProperty(body(response), 'password')
  })

  test('promover troca o papel', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const response = await client
      .put(`/administrator/users/${user.id}`)
      .cookies(session)
      .json({ role: USER_ROLE.ADMINISTRATOR })

    response.assertStatus(200)
    assert.equal(body(response).role, USER_ROLE.ADMINISTRATOR)
  })

  test('email of another account responds 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const response = await client
      .put(`/administrator/users/${user.id}`)
      .cookies(session)
      .json({ email: ADMINISTRATOR.email })

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_ALREADY_EXISTS')
  })

  test('changing the password drops the sessions of the changed account', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    // A live session of the target, created before the change.
    const before = await client
      .post('/authentication/sign-in')
      .json({ email: user.email, password: 'Demo1234!' })
    before.assertStatus(204)

    const response = await client
      .put(`/administrator/users/${user.id}`)
      .cookies(session)
      .json({ password: 'Outra1234!', passwordConfirmation: 'Outra1234!' })

    response.assertStatus(200)
    // Without the revocation, switching someone\'s access off would switch nothing off: the token
    // issued before the change would remain valid until it expired.
    const [{ count }] = await db
      .from('auth_access_tokens')
      .where('tokenable_id', user.id)
      .count('* as count')
    assert.equal(Number(count), 0)
  })

  test('archived user is not editable', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const response = await client
      .put(`/administrator/users/${user.id}`)
      .cookies(session)
      .json({ name: 'Editado' })

    response.assertStatus(404)
  })

  test('null role or empty name responds 422 and does not save', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.merge({ name: 'Original' }).create()

    for (const payload of [{ role: null }, { name: '' }]) {
      const response = await client
        .put(`/administrator/users/${user.id}`)
        .cookies(session)
        .json(payload)

      response.assertStatus(422)
    }
    await user.refresh()
    assert.equal(user.name, 'Original')
    assert.equal(user.role, USER_ROLE.ADVISOR)
  })
})

test.group('administrator/users/update > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.put('/administrator/users/00000000-0000-4000-8000-000000000000')

    response.assertStatus(401)
  })

  test('403: advisor does not reach the organization route', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .put('/administrator/users/00000000-0000-4000-8000-000000000000')
      .cookies(advisor)

    response.assertStatus(403)
  })
})
