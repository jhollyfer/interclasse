import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import { authenticateAsAdvisor, body, resetDatabase, signInWithFactory } from '#tests/http-fixtures'

test.group('advisor/photos > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('200: só as fotos de quem pede', async ({ client, assert }) => {
    const mine = await authenticateAsAdvisor(client)
    const other = await authenticateAsAdvisor(client)
    const first = await StorageFactory.create()
    const second = await StorageFactory.create()
    await client.post('/advisor/photos').cookies(mine).json({ storageId: first.id })
    await client.post('/advisor/photos').cookies(other).json({ storageId: second.id })

    const response = await client.get('/advisor/photos').cookies(mine)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].storage.id, first.id)
  })

  test('401: sem sessão', async ({ client }) => {
    const response = await client.get('/advisor/photos')

    response.assertStatus(401)
  })

  test('403: representante não lista fotos', async ({ client }) => {
    const { session } = await signInWithFactory(client, 'representative')

    const response = await client.get('/advisor/photos').cookies(session)

    response.assertStatus(403)
  })

  test('422: página inválida', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/advisor/photos').qs({ page: 0 }).cookies(advisor)

    response.assertStatus(422)
  })
})
