import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import type { ApiClient } from '@japa/api-client'
import type { StorageMimetype } from '@interclasse/shared'

import { StorageContract } from '#services/storage/storage.contract'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
  type ResponseBody,
} from '#tests/http-fixtures'
import type { Session } from '#tests/http-fixtures'
import { pngBytes } from '#tests/storages-fixtures'

/**
 * The file as a neutral, shared record: it does not belong to the
 * form that submitted it, and ownership authorizes nothing. What rules is the state
 * (`PENDING` or `UPLOADED`) and the live reference.
 */

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

test.group('storages > download', (group) => {
  group.each.setup(() => resetDatabase())

  test('refuses whoever has no session', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    // With the bucket private, this route is the only path to the binary. Open,
    // it issued a signed URL for any uuid without a session - the back
    // door the closing of the bucket left open.
    const response = await client.get(`/storages/${storage.id}/download`).redirects(0)

    response.assertStatus(401)
  })

  test('redirects to a temporary bucket URL', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    // Without following the redirect, to see what the **application** responds.
    const response = await client
      .get(`/storages/${storage.id}/download`)
      .cookies(session)
      .redirects(0)

    response.assertStatus(302)

    const location = response.header('location')

    // Signed and temporary: never the raw, permanent URL of the object.
    assert.include(location, 'X-Amz-Signature')
    assert.include(location, 'X-Amz-Expires')
  })

  test('the file arrives with the original name at the end of the redirect', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const response = await client.get(`/storages/${storage.id}/download`).cookies(session)

    response.assertStatus(200)

    const disposition = response.header('content-disposition')

    assert.include(disposition, 'attachment')
    // Both names, as RFC 6266 asks.
    assert.include(disposition, 'filename="capa.png"')
    assert.include(disposition, "filename*=UTF-8''capa.png")
  })

  test('the advisor cannot download a file that is not theirs: only the administrator operates the collection', async ({
    client,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const storage = await upload(client, admin)

    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .get(`/storages/${storage.id}/download`)
      .cookies(advisor)
      .redirects(0)

    response.assertStatus(404)
  })

  test('responds 404 for a nonexistent id', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client
      .get('/storages/00000000-0000-4000-8000-000000000000/download')
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })
})

/**
 * The header that makes the file arrive with the name the person uploaded.
 *
 * RFC 6266 asks for both names: `filename=` carries only ASCII, and
 * `filename*=UTF-8''` is what preserves accents. Sending only one of them breaks
 * half of the clients.
 */
test.group('storages > contentDisposition', () => {
  test('keeps the accent in the UTF-8 version and removes it in the ASCII one', async ({
    assert,
  }) => {
    const service = await app.container.make(StorageContract)

    const header = service.contentDisposition('Relatório Anual.pdf')

    assert.include(header, 'filename="Relatorio Anual.pdf"')
    assert.include(header, "filename*=UTF-8''Relat%C3%B3rio%20Anual.pdf")
  })

  test('neutralizes quotes, which would escape the header', async ({ assert }) => {
    const service = await app.container.make(StorageContract)

    const header = service.contentDisposition('nota "final".pdf')

    assert.include(header, 'filename="nota _final_.pdf"')
  })
})

test.group('storages > download > identificador', (group) => {
  group.each.setup(() => resetDatabase())

  test('malformed id responds 422 instead of a Postgres 500', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/storages/x/download').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })
})
