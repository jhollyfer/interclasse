import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { UserFactory } from '#database/factories/user.factory'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('classrooms > paginate (advisor)', (group) => {
  group.each.setup(() => resetDatabase())

  test('the advisor sees only the classroom they advise', async ({ client, assert }) => {
    const { user, session } = await signInWithFactory(client)
    await ClassroomFactory.merge({ name: '9º B', advisorId: user.id }).create()
    await ClassroomFactory.merge({ name: '7º A' }).create()
    await ClassroomFactory.merge({ name: '8º C' }).create()

    const response = await client.get('/advisor/classrooms').cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).meta.total, 1)
    assert.deepEqual(
      body(response).data.map((classroom: { name: string }) => classroom.name),
      ['9º B'],
    )
  })

  test('advisor without a classroom receives an empty list, even when other classrooms exist', async ({
    client,
    assert,
  }) => {
    const { session } = await signInWithFactory(client)
    const other = await UserFactory.create()
    await ClassroomFactory.merge({ advisorId: other.id }).create()

    const response = await client.get('/advisor/classrooms').cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 0)
    assert.equal(body(response).meta.total, 0)
  })

  test('the administrator sees all of them', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { user } = await signInWithFactory(client)
    await ClassroomFactory.merge({ advisorId: user.id }).create()
    await ClassroomFactory.create()

    const response = await client.get('/advisor/classrooms').cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 2)
  })

  test('`?search` filters by name within the scope', async ({ client, assert }) => {
    const { user, session } = await signInWithFactory(client)
    await ClassroomFactory.merge({ name: '6º B', advisorId: user.id }).create()
    // Matches the search, but belongs to another advisor: scope applies before the filter.
    await ClassroomFactory.merge({ name: '7º B' }).create()

    const matching = await client.get('/advisor/classrooms').qs({ search: 'B' }).cookies(session)
    const nothing = await client.get('/advisor/classrooms').qs({ search: 'A' }).cookies(session)

    matching.assertStatus(200)
    assert.deepEqual(
      body(matching).data.map((classroom: { name: string }) => classroom.name),
      ['6º B'],
    )
    assert.lengthOf(body(nothing).data, 0)
  })

  test('without a session responds 401, representative responds 403', async ({
    client,
    assert,
  }) => {
    const anonymous = await client.get('/advisor/classrooms')
    anonymous.assertStatus(401)

    const { session } = await signInWithFactory(client, 'representative')
    const response = await client.get('/advisor/classrooms').cookies(session)

    response.assertStatus(403)
    assert.equal(body(response).code, 'ACCESS_DENIED')
  })
})

test.group('advisor/classrooms/paginate > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('malformed page responds 422 pointing at the field', async ({ client, assert }) => {
    const { session } = await signInWithFactory(client)

    const response = await client.get('/advisor/classrooms').qs({ page: 'x' }).cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'page')
  })
})
