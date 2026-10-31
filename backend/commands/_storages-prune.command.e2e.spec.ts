import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import type { ApiClient } from '@japa/api-client'
import type { StorageMimetype } from '@interclasse/shared'

import { MultipartContract, PART_SIZE } from '#services/multipart/multipart.contract'
import StoragesPrune from '#commands/storages-prune.command'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  type ResponseBody,
} from '#tests/http-fixtures'
import type { Session } from '#tests/http-fixtures'
import { ageStorage, pngBytes, storageExists } from '#tests/storages-fixtures'

/**
 * The file as a neutral, shared record: it does not belong to the form that sent it,
 * and ownership authorizes nothing. What rules is the state (`PENDING` or `UPLOADED`)
 * and the live reference.
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

  if (!response.ok) throw new Error(`PUT answered ${response.status}`)

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

/**
 * The sweep of abandoned `PENDING` (`node ace storages:prune`).
 *
 * `PENDING` is the only state one never leaves on one's own: whoever closes the tab
 * mid-upload never calls `complete` or `DELETE`, and the row stays up with the
 * parts hanging in the bucket, invisible in the object listing and billed
 * anyway. It is the command that closes the state machine.
 */
test.group('storages > prune', (group) => {
  group.each.setup(() => resetDatabase())

  /** Ages the row in the database: it is the age the command uses to decide. */
  const age = ageStorage

  async function prune(...args: Array<string>) {
    const ace = await app.container.make('ace')
    const command = await ace.create(StoragesPrune, args)

    await command.exec()

    return command
  }

  test('deletes the old PENDING and aborts its multipart', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const multipart = await app.container.make(MultipartContract)

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size: PART_SIZE + SMALL.byteLength,
    })

    // One part goes up and the other does not: it is the abandonment midway, and these
    // orphan parts are what only the abort reaches.
    await put(opened.parts[0].url, FULL_PART)
    await age(opened.storage.id, 48)

    const command = await prune()

    command.assertSucceeded()

    assert.isFalse(await storageExists(opened.storage.id))
    // Listing the parts of an aborted upload is an error, not an empty list - it is the
    // difference between "aborted" and "open with no part at all".
    await assert.rejects(() => multipart.listParts(opened.storage.path, opened.uploadId))
  })

  test('does not touch a recent PENDING', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    const command = await prune()

    command.assertSucceeded()

    assert.isTrue(await storageExists(opened.storage.id))
  })

  test('does not touch UPLOADED, however old it is', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    await age(storage.id, 24 * 365)

    const command = await prune()

    command.assertSucceeded()

    assert.isTrue(await storageExists(storage.id))
    assert.isTrue(await drive.use().exists(storage.path))
  })

  test('--hours adjusts the cutoff', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    await age(opened.storage.id, 2)

    // Survives the 24h default and does not survive a one-hour cutoff.
    await prune()
    assert.isTrue(await storageExists(opened.storage.id))

    await prune('--hours=1')
    assert.isFalse(await storageExists(opened.storage.id))
  })

  test('--dry-run lists without deleting', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    await age(opened.storage.id, 48)

    const command = await prune('--dry-run')

    command.assertSucceeded()

    assert.isTrue(await storageExists(opened.storage.id))
  })
})
