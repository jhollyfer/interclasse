import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('storefront/photos > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('200: anônimo vê só as aprovadas, sem autor nem status', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const advisor = await authenticateAsAdvisor(client)
    const approved = await StorageFactory.create()
    const pending = await StorageFactory.create()
    await client
      .post('/administrator/photos')
      .cookies(admin)
      .json({ storageId: approved.id, caption: 'Aprovada' })
    await client.post('/advisor/photos').cookies(advisor).json({ storageId: pending.id })

    const response = await client.get('/storefront/photos')

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].caption, 'Aprovada')
    assert.isString(body(response).data[0].url)
    assert.notProperty(body(response).data[0], 'authorId')
    assert.notProperty(body(response).data[0], 'status')
  })

  test('422: página inválida', async ({ client }) => {
    const response = await client.get('/storefront/photos').qs({ page: 0 })

    response.assertStatus(422)
  })
})
