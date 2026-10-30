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

  test('200: o site com o regulamento e a URL assinada', async ({ client, assert }) => {
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

  test('200: sem regulamento, regulation é nulo', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/site').cookies(admin)

    response.assertStatus(200)
    assert.isNull(body(response).regulation)
  })

  test('401: sem sessão', async ({ client }) => {
    const response = await client.get('/administrator/site')

    response.assertStatus(401)
  })

  test('403: conselheiro não lê a configuração do site', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/site').cookies(advisor)

    response.assertStatus(403)
  })
})
