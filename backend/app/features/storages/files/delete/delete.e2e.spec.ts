import { test } from '@japa/runner'
import drive from '@adonisjs/drive/services/main'
import type { ApiClient } from '@japa/api-client'
import type { StorageMimetype } from '@interclasse/shared'

import { StorageFactory } from '#database/factories/storage.factory'
import { PART_SIZE } from '#services/multipart/multipart.contract'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  type ResponseBody,
} from '#tests/http-fixtures'
import { Stored } from '#tests/stored-fixtures'
import type { Session } from '#tests/http-fixtures'
import { pngBytes } from '#tests/storages-fixtures'

/**
 * The file as a neutral, shared record: it does not belong to the
 * form that submitted it, and ownership authorizes nothing. What rules is the state
 * (`PENDING` or `UPLOADED`) and the live reference.
 */

/**
 * Content of a non-final part. S3 refuses less than 5 MB
 * (`EntityTooSmall`), and `PART_SIZE` is what the server promises per part.
 */
const FULL_PART = pngBytes(PART_SIZE, 65)

const SMALL = pngBytes(1024)

/** Opens an upload through the real endpoint and returns the envelope. */
async function open(
  client: ApiClient,
  session: Session,
  payload: { fileName: string; mimetype: StorageMimetype; size: number },
): Promise<ResponseBody> {
  const response = await client.post('/storages').cookies(session).json(payload)

  response.assertStatus(201)

  return body(response)
}

/** Sends a part to the signed URL and returns the `ETag`. */
async function put(url: string, content: Uint8Array): Promise<string> {
  const response = await fetch(url, {
    method: 'PUT',
    body: content,
    headers: { 'Content-Type': 'image/png' },
  })

  if (!response.ok) throw new Error(`PUT respondeu ${response.status}`)

  return response.headers.get('etag') ?? ''
}

/** The whole path, from zero to `UPLOADED`, for a single-part file. */
async function upload(client: ApiClient, session: Session): Promise<ResponseBody> {
  const opened = await open(client, session, {
    fileName: 'capa.png',
    mimetype: 'image/png',
    size: SMALL.byteLength,
  })

  await put(opened.parts[0].url, SMALL)

  const completed = await client
    .post(`/storages/${opened.storage.id}/complete`)
    .cookies(session)
    .json({})

  completed.assertStatus(200)

  return body(completed)
}

/** A `storages` row with no binary at all: only the metadata matters here. */

test.group('storages > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('deletes the orphan file, and the binary vanishes from the bucket along with it', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    // The binary exists beforehand: without this assertion, a `delete` that deleted
    // nothing would pass the one below vacuously.
    assert.isTrue(await drive.use().exists(storage.path))

    const response = await client.delete(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(204)

    assert.isNull(await Stored.storage(storage.id))
    assert.isFalse(await drive.use().exists(storage.path))
  })

  test('cancels an upload in progress and discards the parts', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size: PART_SIZE * 2,
    })

    await put(opened.parts[0].url, FULL_PART)

    const response = await client.delete(`/storages/${opened.storage.id}`).cookies(session)

    response.assertStatus(204)

    assert.isNull(await Stored.storage(opened.storage.id))
    // The upload ceased to exist: asking to resume it now is 404.
    const resumed = await client.get(`/storages/${opened.storage.id}/parts`).cookies(session)
    resumed.assertStatus(404)
  })

  test('refuses with 409 the file in use as an avatar', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const linked = await client.put('/account').cookies(session).json({ avatarId: storage.id })
    linked.assertStatus(200)

    const response = await client.delete(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'STORAGE_IN_USE')

    // The 409 cannot be a "deleted and complained": record and binary are still there.
    assert.isNotNull(await Stored.storage(storage.id))
    assert.isTrue(await drive.use().exists(storage.path))
  })

  test('refuses with 409 the file in use as a gallery photo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const photo = await client
      .post('/administrator/photos')
      .cookies(session)
      .json({ storageId: storage.id })
    photo.assertStatus(201)

    const response = await client.delete(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'STORAGE_IN_USE')
    assert.isNotNull(await Stored.storage(storage.id))
  })

  test('refuses with 409 the file in use as the site regulation', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const pdf = await StorageFactory.merge({ mimetype: 'application/pdf' }).create()

    const linked = await client
      .put('/administrator/site')
      .cookies(session)
      .json({ regulationId: pdf.id })
    linked.assertStatus(200)

    const response = await client.delete(`/storages/${pdf.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'STORAGE_IN_USE')
    assert.isNotNull(await Stored.storage(pdf.id))
  })

  test('accepts again after the attachment is unlinked', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    await client.put('/account').cookies(session).json({ avatarId: storage.id })
    await client.put('/account').cookies(session).json({ avatarId: null })

    const response = await client.delete(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(204)
    assert.isNull(await Stored.storage(storage.id))
  })

  test('responds 404 for a nonexistent id', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .delete('/storages/00000000-0000-4000-8000-000000000000')
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })

  test('requires a session', async ({ client }) => {
    const response = await client.delete('/storages/00000000-0000-4000-8000-000000000000')

    response.assertStatus(401)
  })
})

test.group('storages > delete > identificador', (group) => {
  group.each.setup(() => resetDatabase())

  test('malformed id responds 422 instead of a Postgres 500', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.delete('/storages/x').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })
})
