import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import type { StorageMimetype } from '@interclasse/shared'

import { PART_SIZE } from '#services/multipart/multipart.contract'
import { StoragesFileCreateValidator } from '#validators/storages/files.validator'
import { UPLOAD_MAX_SIZE } from '#validators/storages/files.validator'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  type ResponseBody,
} from '#tests/http-fixtures'
import { Stored } from '#tests/stored-fixtures'
import type { Session } from '#tests/http-fixtures'

/**
 * The file as a neutral, shared record: it does not belong to the
 * form that submitted it, and ownership authorizes nothing. What rules is the state
 * (`PENDING` or `UPLOADED`) and the live reference.
 */

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

/** The whole path, from zero to `UPLOADED`, for a single-part file. */

/** A `storages` row with no binary at all: only the metadata matters here. */

/**
 * What is refused **before** any signature.
 *
 * Directly on the validator, not over HTTP, because that is where the refusal happens: the
 * controller validates before calling the use case, and the use case is the only one that talks
 * to the bucket. A forbidden file gets no URL, so it never reaches the bucket.
 */
test.group('storages > validator', () => {
  test('refuses mimetype outside the list', async ({ assert }) => {
    await assert.rejects(() =>
      StoragesFileCreateValidator.validate({
        fileName: 'script.sh',
        mimetype: 'application/x-sh',
        size: 128,
      }),
    )
  })

  /**
   * Against the environment cap, not against a number written here: since
   * `UPLOAD_MAX_SIZE` is required, this test remains valid whatever
   * the configured value is.
   */
  test('refuses size above the environment cap', async ({ assert }) => {
    await assert.rejects(() =>
      StoragesFileCreateValidator.validate({
        fileName: 'gigante.pdf',
        mimetype: 'application/pdf',
        size: UPLOAD_MAX_SIZE + 1,
      }),
    )
  })

  test('accepts the size at the cap', async ({ assert }) => {
    const payload = await StoragesFileCreateValidator.validate({
      fileName: 'grande.pdf',
      mimetype: 'application/pdf',
      size: UPLOAD_MAX_SIZE,
    })

    assert.equal(payload.size, UPLOAD_MAX_SIZE)
  })
})

test.group('storages > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('a file that fits in one part gets a single URL, without uploadId', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: 2 * 1024 * 1024,
    })

    assert.isNull(opened.uploadId)
    assert.equal(opened.totalParts, 1)
    assert.lengthOf(opened.parts, 1)
    assert.equal(opened.storage.status, 'PENDING')
    // The sent name is a label, never a path: the key is a uuid + extension
    // derived from the mimetype.
    assert.equal(opened.storage.originalName, 'capa.png')
    assert.notInclude(opened.storage.path, 'capa')
    assert.match(opened.storage.path, /\.png$/)
  })

  test('a larger file is sliced, and the number of URLs comes from the size', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    // Two full parts and a remainder: `ceil` must count the remainder.
    const opened = await open(client, session, {
      fileName: 'edital.pdf',
      mimetype: 'application/pdf',
      size: PART_SIZE * 2 + 1,
    })

    assert.isNotNull(opened.uploadId)
    assert.equal(opened.totalParts, 3)
    assert.equal(opened.partSize, PART_SIZE)
    assert.deepEqual(
      opened.parts.map((part: { partNumber: number }) => part.partNumber),
      [1, 2, 3],
    )
  })

  /**
   * `size` is `bigint` in the database. With `integer`, this `POST` would pass
   * validation - the environment cap allows it - and blow up on the `INSERT`, because
   * `int4` stops at 2.1 GB. The test declares 4 GiB and transfers nothing: only the
   * metadata travels, and the row is born `PENDING`.
   *
   * The assertion on the envelope is the wire: the driver returns `int8` as a string, and
   * without the model `consume` the `size` would come out in quotes.
   */
  test('accepts a size above the int4 cap', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const size = 4 * 1024 ** 3

    const opened = await open(client, session, {
      fileName: 'acervo.pdf',
      mimetype: 'application/pdf',
      size,
    })

    assert.strictEqual(opened.storage.size, size)

    const stored = await Stored.storageOrFail(opened.storage.id)
    assert.strictEqual(stored.size, size)
  })

  test('requires a session', async ({ client }) => {
    const response = await client
      .post('/storages')
      .json({ fileName: 'a.png', mimetype: 'image/png', size: 1 })

    response.assertStatus(401)
  })
})

test.group('storages > create > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('type outside the list responds 422 pointing at the field, and no row is born', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/storages')
      .cookies(session)
      .json({ fileName: 'script.sh', mimetype: 'application/x-sh', size: 128 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'mimetype')
    assert.lengthOf(await Stored.storages(), 0)
  })
})
