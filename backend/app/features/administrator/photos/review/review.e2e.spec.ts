import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('photos > review', (group) => {
  group.each.setup(() => resetDatabase())

  test('foto do conselheiro só vai ao site depois de aprovada', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const admin = await authenticateAsAdministrator(client)
    const image = await StorageFactory.create()

    const sent = await client
      .post('/advisor/photos')
      .cookies(advisor)
      .json({ storageId: image.id, caption: 'Final do futsal' })

    sent.assertStatus(201)
    assert.equal(body(sent).status, 'PENDING')

    const before = await client.get('/storefront/photos')
    assert.lengthOf(body(before).data, 0)

    const queue = await client.get('/administrator/photos').qs({ status: 'PENDING' }).cookies(admin)
    assert.lengthOf(body(queue).data, 1)

    const approved = await client
      .put(`/administrator/photos/${body(sent).id}/review`)
      .cookies(admin)
      .json({ status: 'APPROVED' })

    approved.assertStatus(200)

    const after = await client.get('/storefront/photos')
    assert.lengthOf(body(after).data, 1)
    assert.equal(body(after).data[0].caption, 'Final do futsal')
    assert.isString(body(after).data[0].url)
    // O site anônimo não sabe quem enviou.
    assert.notProperty(body(after).data[0], 'authorId')

    const mine = await client.get('/advisor/photos').cookies(advisor)
    assert.equal(body(mine).data[0].status, 'APPROVED')
  })

  test('foto da organização nasce aprovada', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const image = await StorageFactory.create()

    const response = await client
      .post('/administrator/photos')
      .cookies(admin)
      .json({ storageId: image.id })

    response.assertStatus(201)
    assert.equal(body(response).status, 'APPROVED')
  })

  test('arquivo que não é imagem responde 422', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const pdf = await StorageFactory.merge({ mimetype: 'application/pdf' }).create()

    const response = await client
      .post('/advisor/photos')
      .cookies(advisor)
      .json({ storageId: pdf.id })

    response.assertStatus(422)
    assert.equal(body(response).code, 'PHOTO_NOT_IMAGE')
  })

  test('conselheiro não apaga foto de outro: 404', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)
    const advisor = await authenticateAsAdvisor(client)
    const image = await StorageFactory.create()
    const photo = await client
      .post('/administrator/photos')
      .cookies(admin)
      .json({ storageId: image.id })

    const response = await client.delete(`/advisor/photos/${body(photo).id}`).cookies(advisor)

    response.assertStatus(404)
  })
})
