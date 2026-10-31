import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

const NOT_FOUND_ID = '00000000-0000-4000-8000-000000000000'

test.group('advisor/photos > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('204: the advisor deletes their own photo', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const image = await StorageFactory.create()
    const sent = await client.post('/advisor/photos').cookies(advisor).json({ storageId: image.id })

    const response = await client.delete(`/advisor/photos/${body(sent).id}`).cookies(advisor)

    response.assertStatus(204)

    const mine = await client.get('/advisor/photos').cookies(advisor)
    assert.lengthOf(body(mine).data, 0)
  })

  test('204: the organization deletes the photo of any advisor', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)
    const advisor = await authenticateAsAdvisor(client)
    const image = await StorageFactory.create()
    const sent = await client.post('/advisor/photos').cookies(advisor).json({ storageId: image.id })

    const response = await client.delete(`/advisor/photos/${body(sent).id}`).cookies(admin)

    response.assertStatus(204)
  })

  test('401: without a session', async ({ client }) => {
    const response = await client.delete(`/advisor/photos/${NOT_FOUND_ID}`)

    response.assertStatus(401)
  })

  test('403: representative does not delete a photo', async ({ client }) => {
    const { session } = await signInWithFactory(client, 'representative')

    const response = await client.delete(`/advisor/photos/${NOT_FOUND_ID}`).cookies(session)

    response.assertStatus(403)
  })

  test('404: nonexistent photo', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.delete(`/advisor/photos/${NOT_FOUND_ID}`).cookies(advisor)

    response.assertStatus(404)
    assert.equal(body(response).code, 'PHOTO_NOT_FOUND')
  })

  test('422: id that is not a uuid', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.delete('/advisor/photos/nao-e-uuid').cookies(advisor)

    response.assertStatus(422)
  })
})
