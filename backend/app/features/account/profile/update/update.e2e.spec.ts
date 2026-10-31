import { test } from '@japa/runner'
import { UPLOAD_STATUS } from '@interclasse/shared'

import { UserFactory } from '#database/factories/user.factory'
import {
  ADMINISTRATOR,
  authenticate,
  authenticateAsAdministrator,
  body,
  resetDatabase,
} from '#tests/http-fixtures'
import { Stored } from '#tests/stored-fixtures'
import { storageRow } from '#tests/storages-fixtures'

/**
 * Partial update, and the two rules that come with it.
 *
 * `backend-old` used `PATCH` with a validator that required `name`, `email`,
 * `role` and `avatarId` on every request: the verb promised partial and the schema
 * refused partial. Here `PUT` is truly partial, and the missing
 * field test is what prevents regression to the demanding schema.
 *
 * The others assert what the merge alone does not guarantee: a new password equal to the
 * current one is 422, and changing the password drops the running session - without it a token
 * issued before the change would survive it.
 *
 * And the three on `currentPassword`, which is proof of identity and not of strength: the
 * session proves possession of the cookie, so without the current password whoever hijacks a
 * cookie changes the account owner's password. `backend-old` already required it
 * (`profile.validator.ts:15`); the migration had left the requirement behind.
 */
test.group('account > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('partial payload does not erase the missing field', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({ name: 'Outro Nome' })

    response.assertStatus(200)
    assert.equal(body(response).name, 'Outro Nome')
    assert.equal(body(response).email, ADMINISTRATOR.email)

    // And the database row too: neither `email` nor `role` were touched.
    const user = await Stored.userByEmailOrFail(ADMINISTRATOR.email)
    assert.equal(user.name, 'Outro Nome')
    assert.equal(user.role, 'ADMINISTRATOR')
  })

  test('new password equal to the current one responds 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({
      password: ADMINISTRATOR.password,
      passwordConfirmation: ADMINISTRATOR.password,
      currentPassword: ADMINISTRATOR.password,
    })

    response.assertStatus(422)
    assert.equal(body(response).code, 'PASSWORD_SAME_AS_CURRENT')
  })

  test('changing the password without the current one responds 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put('/account')
      .cookies(session)
      .json({ password: 'Outra-Senha1!', passwordConfirmation: 'Outra-Senha1!' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'currentPassword')

    // And the password is still the old one: the new session is the proof.
    await authenticate(client, ADMINISTRATOR.email, ADMINISTRATOR.password)
  })

  test('wrong current password responds 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({
      password: 'Outra-Senha1!',
      passwordConfirmation: 'Outra-Senha1!',
      currentPassword: 'Nao-E-A-Atual1!',
    })

    response.assertStatus(422)
    assert.equal(body(response).code, 'CURRENT_PASSWORD_INVALID')

    await authenticate(client, ADMINISTRATOR.email, ADMINISTRATOR.password)
  })

  test('the rest of the payload does not require the current password', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    // `requiredIfExists('password')`: without `password` in the payload there is no
    // identity to prove, and demanding the current password to change the name would make
    // every profile edit a password form.
    const response = await client.put('/account').cookies(session).json({ name: 'Sem Senha' })

    response.assertStatus(200)
    assert.equal(body(response).name, 'Sem Senha')
  })

  test('changing the password drops the running session', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const swap = await client.put('/account').cookies(session).json({
      password: 'Outra-Senha1!',
      passwordConfirmation: 'Outra-Senha1!',
      currentPassword: ADMINISTRATOR.password,
    })

    swap.assertStatus(200)

    // The same cookie that just worked, now without a token to back it.
    const after = await client.get('/account').cookies(session)

    after.assertStatus(401)
  })

  test('email already used by another account responds 409', async ({ client, assert }) => {
    const other = await UserFactory.create()
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({ email: other.email })

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_ALREADY_EXISTS')
  })

  test('nonexistent avatarId responds 422 instead of blowing up on the foreign key', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put('/account')
      .cookies(session)
      .json({ avatarId: '00000000-0000-4000-8000-000000000000' })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })

  test('empty name responds 422 and does not save', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({ name: '   ' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'name')
    const user = await Stored.userByEmailOrFail(ADMINISTRATOR.email)
    assert.notEqual(user.name.trim(), '')
  })
})

/**
 * Only the confirmed file attaches. Since the binary goes straight to the bucket,
 * the row is born before the file, and attaching a `PENDING` one would publish an avatar
 * that is still halfway there - the screen would show a 404.
 */
test.group('account > update > avatar', (group) => {
  group.each.setup(() => resetDatabase())

  test('refuses with 422 to attach a still PENDING file', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await storageRow({ status: UPLOAD_STATUS.PENDING })

    const response = await client.put('/account').cookies(session).json({ avatarId: storage.id })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })

  /** The pair of the test above: without it, refusing everything would pass vacuously. */
  test('accepts the same file after it is UPLOADED', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await storageRow({ status: UPLOAD_STATUS.UPLOADED })

    const response = await client.put('/account').cookies(session).json({ avatarId: storage.id })

    response.assertStatus(200)
    assert.equal(body(response).avatar.id, storage.id)
  })
})
