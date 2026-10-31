import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('administrator/photos > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('200: lists the photos with the file and who submitted, and filters by status', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const advisor = await authenticateAsAdvisor(client)
    const first = await StorageFactory.create()
    const second = await StorageFactory.create()
    await client.post('/administrator/photos').cookies(admin).json({ storageId: first.id })
    await client.post('/advisor/photos').cookies(advisor).json({ storageId: second.id })

    const all = await client.get('/administrator/photos').cookies(admin)
    const pending = await client
      .get('/administrator/photos')
      .qs({ status: 'PENDING' })
      .cookies(admin)

    all.assertStatus(200)
    assert.lengthOf(body(all).data, 2)
    assert.isString(body(all).data[0].storage.url)
    assert.lengthOf(body(pending).data, 1)
    assert.equal(body(pending).data[0].status, 'PENDING')
  })

  test('401: without a session', async ({ client }) => {
    const response = await client.get('/administrator/photos')

    response.assertStatus(401)
  })

  test('403: advisor does not read the organization queue', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/photos').cookies(advisor)

    response.assertStatus(403)
  })

  test('422: status outside the enum', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/photos').qs({ status: 'XYZ' }).cookies(admin)

    response.assertStatus(422)
  })
})
