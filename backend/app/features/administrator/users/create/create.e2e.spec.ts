import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { ACTIVE_STATUS, USER_ROLE } from '@interclasse/shared'

import { Stored } from '#tests/stored-fixtures'
import { UserFactory } from '#database/factories/user.factory'
import {
  ADMINISTRATOR,
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

/** An already confirmed file, which is the only state `assertExist` accepts. */

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

test.group('administrator > users > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('the account is born ACTIVE and without a password in the response', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.post('/administrator/users').cookies(session).json(payload)

    response.assertStatus(201)
    assert.equal(body(response).role, USER_ROLE.ADVISOR)
    // The column has `DEFAULT 'ACTIVE'` and the payload does not write the missing key.
    assert.equal(body(response).status, ACTIVE_STATUS.ACTIVE)
    assert.notProperty(body(response), 'password')
  })

  test('the password is saved hashed and works to sign in', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const created = await client.post('/administrator/users').cookies(session).json(payload)
    created.assertStatus(201)

    // The `withAuthFinder` mixin hashes on save: saving the plain text would leave the
    // password readable in the database, and a hash of a hash would let nobody in.
    const user = await Stored.userOrFail(body(created).id)
    assert.notEqual(user.password, payload.password)

    const input = await client
      .post('/authentication/sign-in')
      .json({ email: payload.email, password: payload.password })

    input.assertStatus(204)
  })

  test('email of a live account responds 409 pointing at the field', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/users')
      .cookies(session)
      .json({ ...payload, email: ADMINISTRATOR.email })

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_ALREADY_EXISTS')
    assert.property(body(response).errors, 'email')
  })

  test('email of an archived account reactivates the row instead of blowing the unique', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const archived = await UserFactory.merge({
      email: payload.email,
      deletedAt: DateTime.now(),
    }).create()

    const response = await client.post('/administrator/users').cookies(session).json(payload)

    response.assertStatus(201)
    // Same row: `email` is a global `UNIQUE` and removal is logical, so
    // inserting again would hit the index and become a 500.
    assert.equal(body(response).id, archived.id)
    assert.isNull(body(response).deletedAt)

    const [{ count }] = await db.from('users').where('email', payload.email).count('* as count')
    assert.equal(Number(count), 1)
  })

  test('weak password responds 422 pointing at the field', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/users')
      .cookies(session)
      .json({ ...payload, password: 'demo', passwordConfirmation: 'demo' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'password')
  })

  test('missing role responds 422: the role is always explicit', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const { role: _noRole, ...noRole } = payload

    const response = await client.post('/administrator/users').cookies(session).json(noRole)

    response.assertStatus(422)
    // `backend-old` fell back to ADMINISTRATOR by omission, and a forgotten creation path
    // silently saved the most powerful role.
    assert.property(body(response).errors, 'role')
  })

  test('nonexistent photo responds 422 pointing at the field and before saving', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/users')
      .cookies(session)
      .json({ ...payload, avatarId: randomUUID() })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
    assert.property(body(response).errors, 'avatarId')

    const [{ count }] = await db.from('users').where('email', payload.email).count('* as count')
    assert.equal(Number(count), 0)
  })
})

test.group('administrator/users/create > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.post('/administrator/users')

    response.assertStatus(401)
  })

  test('403: advisor does not reach the organization route', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.post('/administrator/users').cookies(advisor)

    response.assertStatus(403)
  })
})
