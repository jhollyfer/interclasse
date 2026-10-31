import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { StorageFactory } from '#database/factories/storage.factory'
import { UserFactory } from '#database/factories/user.factory'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

test.group('administrador > users > leitura', (group) => {
  group.each.setup(() => resetDatabase())

  test('the photo comes out nested and the password does not', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const avatar = await StorageFactory.create()

    const user = await UserFactory.merge({ avatarId: avatar.id }).create()

    const response = await client.get(`/administrator/users/${user.id}`).cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).avatar.id, avatar.id)
    assert.notProperty(body(response), 'password')
  })

  test('archived user responds 404', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const response = await client.get(`/administrator/users/${user.id}`).cookies(session)

    response.assertStatus(404)
  })
})

test.group('administrator/users/show > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.get('/administrator/users/00000000-0000-4000-8000-000000000000')

    response.assertStatus(401)
  })

  test('403: advisor does not reach the organization route', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .get('/administrator/users/00000000-0000-4000-8000-000000000000')
      .cookies(advisor)

    response.assertStatus(403)
  })

  test('422: id that is not a uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/users/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
  })
})
