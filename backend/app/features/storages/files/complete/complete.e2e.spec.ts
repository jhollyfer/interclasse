import { test } from '@japa/runner'
import drive from '@adonisjs/drive/services/main'
import type { ApiClient } from '@japa/api-client'
import type { StorageMimetype } from '@interclasse/shared'

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

test.group('storages > complete', (group) => {
  group.each.setup(() => resetDatabase())

  test('confirms the upload and the file becomes UPLOADED', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    assert.equal(storage.status, 'UPLOADED')
    assert.isTrue(await drive.use().exists(storage.path))
  })

  test('reassembles the parts of a multipart', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const size = PART_SIZE + SMALL.byteLength

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size,
    })

    const parts = [
      { partNumber: 1, etag: await put(opened.parts[0].url, FULL_PART) },
      { partNumber: 2, etag: await put(opened.parts[1].url, SMALL) },
    ]

    const response = await client
      .post(`/storages/${opened.storage.id}/complete`)
      .cookies(session)
      .json({ parts })

    response.assertStatus(200)

    const metadata = await drive.use().getMetaData(opened.storage.path)

    assert.equal(metadata.contentLength, size)
    // The `uploadId` is zeroed: the conversation with the bucket is over, and keeping its
    // pointer would only keep alive an address that leads nowhere.
    assert.isNull(body(response).uploadId)
  })

  test('refuses with 422 when what was uploaded does not have the declared size', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    // Declares a thousand bytes and tries to upload ten. The first barrier is the bucket's:
    // the URL pins `content-length`, and a PUT with another size gets 403.
    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: 1000,
    })

    const refused = await fetch(opened.parts[0].url, {
      method: 'PUT',
      body: new Uint8Array(10),
      headers: { 'Content-Type': 'image/png' },
    })
    assert.equal(refused.status, 403)

    // The second is `complete`, for the object that reached the bucket another
    // way (storage without the size signature): it writes directly, without the URL.
    await drive.use().put(opened.storage.path, Buffer.from(new Uint8Array(10)))

    const response = await client
      .post(`/storages/${opened.storage.id}/complete`)
      .cookies(session)
      .json({})

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_SIZE_MISMATCH')

    // Refused is refused: neither the row nor the binary survive, and the record
    // never reaches `UPLOADED`.
    assert.isNull(await Stored.storage(opened.storage.id))
    assert.isFalse(await drive.use().exists(opened.storage.path))
  })

  test('confirming twice returns the same record', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const again = await client.post(`/storages/${storage.id}/complete`).cookies(session).json({})

    again.assertStatus(200)
    assert.equal(body(again).id, storage.id)
    assert.equal(body(again).status, 'UPLOADED')
  })
})

test.group('storages > complete > acesso e identificador', (group) => {
  group.each.setup(() => resetDatabase())

  test('without a session responds 401', async ({ client }) => {
    const response = await client
      .post(`/storages/00000000-0000-4000-8000-000000000000/complete`)
      .json({})

    response.assertStatus(401)
  })

  test('nonexistent id responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post(`/storages/00000000-0000-4000-8000-000000000000/complete`)
      .cookies(session)
      .json({})

    response.assertStatus(404)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })

  test('malformed id responds 422 instead of a Postgres 500', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.post('/storages/x/complete').cookies(session).json({})

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })
})
