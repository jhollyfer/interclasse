import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { ACTIVE_STATUS, USER_ROLE } from '@interclasse/shared'

import { UserFactory } from '#database/factories/user.factory'
import {
  ADMINISTRATOR,
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
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

test.group('administrador > users > listagem', (group) => {
  group.each.setup(() => resetDatabase())

  test('without ?trashed the listing hides the archived ones', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    await UserFactory.merge({ name: 'Arquivado', deletedAt: DateTime.now() }).create()

    const response = await client.get('/administrator/users').cookies(session)

    response.assertStatus(200)
    // Only the seeder administrator: the archived one stays out.
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].email, ADMINISTRATOR.email)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('?role narrows the list by role', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const editor = await UserFactory.create()

    const response = await client
      .get('/administrator/users')
      .qs({ role: USER_ROLE.ADVISOR })
      .cookies(session)

    response.assertStatus(200)
    // The seeder administrator does not enter the cut.
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, editor.id)
  })

  test('?status narrows the list by access', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const inactive = await UserFactory.apply('inactive').create()

    const response = await client
      .get('/administrator/users')
      .qs({ status: ACTIVE_STATUS.INACTIVE })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, inactive.id)
  })

  test('the password does not come out in the listing', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    await UserFactory.create()

    const response = await client.get('/administrator/users').cookies(session)

    response.assertStatus(200)
    for (const user of body(response).data) assert.notProperty(user, 'password')
  })

  test('?sort outside the closed tuple responds 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    // `password` is a `users` column, but not a sort column: the value
    // would go straight into `orderBy` and compose SQL.
    //
    // The query goes in the URL itself, not in `.qs()`: the Tuyau registry types the
    // object by the closed tuple, and the invalid value this test exists to
    // send would not compile.
    const response = await client.get('/administrator/users?sort=password').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'sort')
  })

  test('?search does not escape the trash filter', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const alive = await UserFactory.merge({ name: 'Joana Ribeiro' }).create()
    // Matches the search by **email**, not by name, and is archived: with the
    // loose `OR` it would show up in the default listing, because the `OR` cancels the
    // previous `AND`. The term has to land on the second search column; on the first, the
    // loose `OR` would give the same answer as the grouped one.
    await UserFactory.merge({
      name: 'Arquivada sem o termo no nome',
      email: 'joana.arquivada@mail.com',
      deletedAt: DateTime.now(),
    }).create()

    const response = await client
      .get('/administrator/users')
      .qs({ search: 'joana' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, alive.id)
  })
})

/**
 * The whole module belongs to the administrator, not only `DELETE` as in the content
 * resources: whoever edits content does not reach who enters the panel - including the
 * read, which exposes everyone's email.
 *
 * One case per route of the group, not a single one: the middleware is on the subgroup, and a
 * new route born outside it would not be caught by a single assertion.
 */
test.group('administrator > users > the advisor does not reach the module', (group) => {
  group.each.setup(() => resetDatabase())

  test('advisor gets 403 on every users route', async ({ client, assert }) => {
    const session = await authenticateAsAdvisor(client)
    const target = await UserFactory.create()

    const responses = [
      await client.get('/administrator/users').cookies(session),
      await client.post('/administrator/users').cookies(session).json(payload),
      await client.get(`/administrator/users/${target.id}`).cookies(session),
      await client.put(`/administrator/users/${target.id}`).cookies(session).json({ name: 'X' }),
      await client.patch(`/administrator/users/${target.id}/archive`).cookies(session),
      await client.patch(`/administrator/users/${target.id}/unarchive`).cookies(session),
      await client.delete(`/administrator/users/${target.id}`).cookies(session),
    ]

    for (const response of responses) {
      response.assertStatus(403)
      assert.equal(body(response).code, 'ACCESS_DENIED')
    }
  })
})

test.group('administrator/users/paginate > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.get('/administrator/users')

    response.assertStatus(401)
  })
})
