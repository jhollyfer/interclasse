import { test } from '@japa/runner'
import { UPLOAD_STATUS } from '@interclasse/shared'

import { storageRow } from '#tests/storages-fixtures'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/http-fixtures'

/**
 * The file as a neutral, shared record: it does not belong to the
 * form that submitted it, and ownership authorizes nothing. What rules is the state
 * (`PENDING` or `UPLOADED`) and the live reference.
 */

/** Opens an upload through the real endpoint and returns the envelope. */

/** Sends a part to the signed URL and returns the `ETag`. */

/** The whole path, from zero to `UPLOADED`, for a single-part file. */

/** A `storages` row with no binary at all: only the metadata matters here. */

test.group('storages > detalhe', (group) => {
  group.each.setup(() => resetDatabase())

  test('responds 200 with the derived url', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await storageRow()

    const response = await client.get(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).id, storage.id)
    assert.equal(body(response).originalName, 'capa.png')
    // Not a column: the model hook resolves it on read from `path`.
    assert.include(body(response).url, storage.path)
  })

  test('reaches the still PENDING upload', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await storageRow({ status: UPLOAD_STATUS.PENDING })

    // The detail screen is where one discovers that an upload was left half-done.
    // What requires `UPLOADED` is the attachment, not the read.
    const response = await client.get(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).status, 'PENDING')
  })

  test('nonexistent id responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .get('/storages/00000000-0000-4000-8000-000000000000')
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })

  test('malformed id responds 422 instead of a Postgres 500', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/storages/nao-e-uuid').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })
})

test.group('storages > detalhe > acesso', (group) => {
  group.each.setup(() => resetDatabase())

  test('without a session responds 401', async ({ client }) => {
    const storage = await storageRow()

    const response = await client.get(`/storages/${storage.id}`)

    response.assertStatus(401)
  })
})
