import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import { authenticateAsAdvisor, body, resetDatabase, signInWithFactory } from '#tests/http-fixtures'

const NOT_FOUND_ID = '00000000-0000-4000-8000-000000000000'

test.group('advisor/photos > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('201: the advisor photo is born PENDING', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const image = await StorageFactory.create()

    const response = await client
      .post('/advisor/photos')
      .cookies(advisor)
      .json({ storageId: image.id, caption: 'Final' })

    response.assertStatus(201)
    assert.equal(body(response).status, 'PENDING')
  })

  test('401: without a session', async ({ client }) => {
    const image = await StorageFactory.create()

    const response = await client.post('/advisor/photos').json({ storageId: image.id })

    response.assertStatus(401)
  })

  test('403: representative does not submit a photo', async ({ client }) => {
    const { session } = await signInWithFactory(client, 'representative')
    const image = await StorageFactory.create()

    const response = await client
      .post('/advisor/photos')
      .cookies(session)
      .json({ storageId: image.id })

    response.assertStatus(403)
  })

  test('422: without storageId', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.post('/advisor/photos').cookies(advisor).json({})

    response.assertStatus(422)
    assert.property(body(response).errors, 'storageId')
  })

  test('422: nonexistent file', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .post('/advisor/photos')
      .cookies(advisor)
      .json({ storageId: NOT_FOUND_ID })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })
})
