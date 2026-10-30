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

  test('204: o conselheiro apaga a própria foto', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const image = await StorageFactory.create()
    const sent = await client.post('/advisor/photos').cookies(advisor).json({ storageId: image.id })

    const response = await client.delete(`/advisor/photos/${body(sent).id}`).cookies(advisor)

    response.assertStatus(204)

    const mine = await client.get('/advisor/photos').cookies(advisor)
    assert.lengthOf(body(mine).data, 0)
  })

  test('204: a organização apaga a foto de qualquer conselheiro', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)
    const advisor = await authenticateAsAdvisor(client)
    const image = await StorageFactory.create()
    const sent = await client.post('/advisor/photos').cookies(advisor).json({ storageId: image.id })

    const response = await client.delete(`/advisor/photos/${body(sent).id}`).cookies(admin)

    response.assertStatus(204)
  })

  test('401: sem sessão', async ({ client }) => {
    const response = await client.delete(`/advisor/photos/${NOT_FOUND_ID}`)

    response.assertStatus(401)
  })

  test('403: representante não apaga foto', async ({ client }) => {
    const { session } = await signInWithFactory(client, 'representative')

    const response = await client.delete(`/advisor/photos/${NOT_FOUND_ID}`).cookies(session)

    response.assertStatus(403)
  })

  test('404: foto inexistente', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.delete(`/advisor/photos/${NOT_FOUND_ID}`).cookies(advisor)

    response.assertStatus(404)
    assert.equal(body(response).code, 'PHOTO_NOT_FOUND')
  })

  test('422: id que não é uuid', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.delete('/advisor/photos/nao-e-uuid').cookies(advisor)

    response.assertStatus(422)
  })
})
