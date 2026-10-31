import { test } from '@japa/runner'

import { StorageFactory } from '#database/factories/storage.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('site > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('saves the "About" and the regulation, and the anonymous site reads both', async ({
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
    // The anonymous site does not see the path in the bucket.
    assert.notProperty(body(site).regulation, 'path')
  })

  test('regulation that is not a PDF responds 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const image = await StorageFactory.create()

    const response = await client
      .put('/administrator/site')
      .cookies(session)
      .json({ regulationId: image.id })

    response.assertStatus(422)
    assert.equal(body(response).code, 'REGULATION_NOT_PDF')
  })

  test('null erases the field and missing does not touch', async ({ client, assert }) => {
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

  test('without an administrator account is 403', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.put('/administrator/site').cookies(advisor).json({ edition: 1 })

    response.assertStatus(403)
  })
})

test.group('administrator/site/update > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.put('/administrator/site')

    response.assertStatus(401)
  })
})
