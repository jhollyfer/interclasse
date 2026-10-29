import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('site > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('grava o "Sobre" e o regulamento, e o site anônimo lê os dois', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const pdf = await StorageFactory.merge({
      mimetype: 'application/pdf',
      originalName: 'regulamento.pdf',
    }).create()

    const response = await client.put('/administrator/site').cookies(session).json({
      about: 'Os jogos interclasse do CMEI.',
      edition: 2,
      firstEditionYear: 2025,
      schoolInstagram: 'cmei_cosmejean',
      regulationId: pdf.id,
    })

    response.assertStatus(200)
    assert.equal(body(response).edition, 2)

    const site = await client.get('/storefront/site')

    site.assertStatus(200)
    assert.equal(body(site).about, 'Os jogos interclasse do CMEI.')
    assert.equal(body(site).firstEditionYear, 2025)
    assert.equal(body(site).regulation.originalName, 'regulamento.pdf')
    assert.isString(body(site).regulation.url)
    // O site anônimo não vê o caminho no bucket.
    assert.notProperty(body(site).regulation, 'path')
  })

  test('regulamento que não é PDF responde 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const image = await StorageFactory.create()

    const response = await client
      .put('/administrator/site')
      .cookies(session)
      .json({ regulationId: image.id })

    response.assertStatus(422)
    assert.equal(body(response).code, 'REGULATION_NOT_PDF')
  })

  test('null apaga o campo e ausente não mexe', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await client
      .put('/administrator/site')
      .cookies(session)
      .json({ organizer: 'Professores do CMEI', edition: 3 })

    const response = await client
      .put('/administrator/site')
      .cookies(session)
      .json({ organizer: null })

    response.assertStatus(200)
    assert.isNull(body(response).organizer)
    assert.equal(body(response).edition, 3)
  })

  test('sem conta de administrador é 403', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.put('/administrator/site').cookies(advisor).json({ edition: 1 })

    response.assertStatus(403)
  })
})
