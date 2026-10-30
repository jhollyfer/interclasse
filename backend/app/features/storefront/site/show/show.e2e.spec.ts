import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/http-fixtures'

test.group('storefront/site > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('200: anônimo lê o site, sem regulamento enquanto não houver PDF', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/storefront/site')

    response.assertStatus(200)
    assert.isNull(body(response).regulation)
  })

  test('200: com PDF, entrega nome, tamanho e URL, sem id nem caminho', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const pdf = await StorageFactory.merge({
      mimetype: 'application/pdf',
      originalName: 'regulamento.pdf',
    }).create()
    await client.put('/administrator/site').cookies(admin).json({ regulationId: pdf.id })

    const response = await client.get('/storefront/site')

    response.assertStatus(200)
    assert.equal(body(response).regulation.originalName, 'regulamento.pdf')
    assert.isString(body(response).regulation.url)
    assert.notProperty(body(response).regulation, 'path')
    assert.notProperty(body(response), 'regulationId')
  })
})
