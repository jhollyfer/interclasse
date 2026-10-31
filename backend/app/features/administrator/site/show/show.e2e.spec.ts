import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('administrator/site > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('200: the site with the regulation and the signed URL', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const pdf = await StorageFactory.merge({
      mimetype: 'application/pdf',
      originalName: 'regulamento.pdf',
    }).create()
    await client.put('/administrator/site').cookies(admin).json({ regulationId: pdf.id })

    const response = await client.get('/administrator/site').cookies(admin)

    response.assertStatus(200)
    assert.equal(body(response).regulationId, pdf.id)
    assert.equal(body(response).regulation.originalName, 'regulamento.pdf')
    assert.isString(body(response).regulation.url)
  })

  test('200: without a regulation, regulation is null', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/site').cookies(admin)

    response.assertStatus(200)
    assert.isNull(body(response).regulation)
  })

  test('401: without a session', async ({ client }) => {
    const response = await client.get('/administrator/site')

    response.assertStatus(401)
  })

  test('403: advisor does not read the site configuration', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/site').cookies(advisor)

    response.assertStatus(403)
  })
})
