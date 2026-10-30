import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

const NOT_FOUND_ID = '00000000-0000-4000-8000-000000000000'

test.group('administrator/photos > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('201: a foto da organização nasce aprovada, com o autor', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const image = await StorageFactory.create()

    const response = await client
      .post('/administrator/photos')
      .cookies(admin)
      .json({ storageId: image.id, caption: 'Abertura' })

    response.assertStatus(201)
    assert.equal(body(response).status, 'APPROVED')
    assert.equal(body(response).caption, 'Abertura')
    assert.equal(body(response).storage.id, image.id)
  })

  test('401: sem sessão', async ({ client }) => {
    const image = await StorageFactory.create()

    const response = await client.post('/administrator/photos').json({ storageId: image.id })

    response.assertStatus(401)
  })

  test('403: conselheiro não usa a rota da organização', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)
    const image = await StorageFactory.create()

    const response = await client
      .post('/administrator/photos')
      .cookies(advisor)
      .json({ storageId: image.id })

    response.assertStatus(403)
  })

  test('422: sem storageId', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.post('/administrator/photos').cookies(admin).json({})

    response.assertStatus(422)
    assert.property(body(response).errors, 'storageId')
  })

  test('422: arquivo inexistente', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/photos')
      .cookies(admin)
      .json({ storageId: NOT_FOUND_ID })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })

  test('422: arquivo que não é imagem', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const pdf = await StorageFactory.merge({ mimetype: 'application/pdf' }).create()

    const response = await client
      .post('/administrator/photos')
      .cookies(admin)
      .json({ storageId: pdf.id })

    response.assertStatus(422)
    assert.equal(body(response).code, 'PHOTO_NOT_IMAGE')
  })
})
