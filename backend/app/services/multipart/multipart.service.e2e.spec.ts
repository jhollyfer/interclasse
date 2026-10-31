import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'

import { MultipartContract } from '#services/multipart/multipart.contract'

/**
 * Multipart against the real bucket (the `docker-compose.yml` MinIO).
 *
 * Against the real storage and not against a double because the protocol is precisely
 * what is under test: the 5 MB minimum per part, the `ETag` that only comes in the
 * response header, the URL that expires and the `ListParts` that sees what went up. A
 * double would answer whatever I programmed and would prove none of that.
 */

/**
 * S3 refuses a non-final part under 5 MB (`EntityTooSmall`), so the
 * first has exactly the minimum. The second is tiny on purpose: it is the
 * last, and it has no minimum.
 */
const FIRST_PART = new Uint8Array(5 * 1024 * 1024).fill(65)
const LAST_PART = new Uint8Array(1024).fill(66)

/** Sends a part to the signed URL and returns the `ETag` the bucket gave. */
async function put(url: string, body: Uint8Array): Promise<string> {
  const response = await fetch(url, { method: 'PUT', body })

  if (!response.ok) {
    throw new Error(`PUT of the part answered ${response.status}`)
  }

  const etag = response.headers.get('etag')

  if (!etag) {
    throw new Error('bucket did not return an ETag - complete would be impossible')
  }

  return etag
}

/** The item at the position, or fails the test: a list shorter than expected is the defect. */
function item<T>(list: ReadonlyArray<T>, index: number): T {
  const found = list[index]
  if (found === undefined) throw new Error(`list without position ${index}`)
  return found
}

test.group('multipart', () => {
  test('uploads in parts, reassembles, and the final object has the sum of the sizes', async ({
    assert,
  }) => {
    const multipart = await app.container.make(MultipartContract)
    const key = `test-${randomUUID()}.bin`

    const uploadId = await multipart.initiate(key, 'application/octet-stream')
    const urls = await multipart.signParts(key, uploadId, [
      { partNumber: 1, size: FIRST_PART.byteLength },
      { partNumber: 2, size: LAST_PART.byteLength },
    ])

    assert.lengthOf(urls, 2)
    assert.deepEqual(
      urls.map((part) => part.partNumber),
      [1, 2],
    )

    const parts = [
      { partNumber: 1, etag: await put(item(urls, 0).url, FIRST_PART) },
      { partNumber: 2, etag: await put(item(urls, 1).url, LAST_PART) },
    ]

    // Before complete, nothing exists at the final key: what the bucket has is the
    // parts, and that is what resuming sees.
    assert.isFalse(await drive.use().exists(key))

    const received = await multipart.listParts(key, uploadId)

    assert.lengthOf(received, 2)
    assert.equal(item(received, 0).size, FIRST_PART.byteLength)
    assert.equal(item(received, 1).size, LAST_PART.byteLength)

    await multipart.complete(key, uploadId, parts)

    const metadata = await drive.use().getMetaData(key)

    assert.equal(metadata.contentLength, FIRST_PART.byteLength + LAST_PART.byteLength)

    await drive.use().delete(key)
  })

  test('listParts sees only what went up, and that is what resuming uses', async ({ assert }) => {
    const multipart = await app.container.make(MultipartContract)
    const key = `test-${randomUUID()}.bin`

    const uploadId = await multipart.initiate(key, 'application/octet-stream')
    const first = item(
      await multipart.signParts(key, uploadId, [{ partNumber: 1, size: FIRST_PART.byteLength }]),
      0,
    )

    await put(first.url, FIRST_PART)

    const received = await multipart.listParts(key, uploadId)

    assert.deepEqual(
      received.map((part) => part.partNumber),
      [1],
    )

    await multipart.abort(key, uploadId)
  })

  test('abort discards the parts, and nothing is left occupying the bucket', async ({ assert }) => {
    const multipart = await app.container.make(MultipartContract)
    const key = `test-${randomUUID()}.bin`

    const uploadId = await multipart.initiate(key, 'application/octet-stream')
    const first = item(
      await multipart.signParts(key, uploadId, [{ partNumber: 1, size: FIRST_PART.byteLength }]),
      0,
    )

    await put(first.url, FIRST_PART)
    await multipart.abort(key, uploadId)

    // The upload no longer exists: listing its parts now is an error, not an
    // empty list. It is the difference between "aborted" and "open with no parts".
    await assert.rejects(() => multipart.listParts(key, uploadId))
    assert.isFalse(await drive.use().exists(key))
  })

  test('a signed URL stops being valid after it expires', async ({ assert }) => {
    const multipart = await app.container.make(MultipartContract)
    const key = `test-${randomUUID()}.bin`

    const uploadId = await multipart.initiate(key, 'application/octet-stream')
    const expiring = item(
      await multipart.signParts(key, uploadId, [{ partNumber: 1, size: LAST_PART.byteLength }], 1),
      0,
    )

    await new Promise((resolve) => setTimeout(resolve, 1_500))

    const refused = await fetch(expiring.url, { method: 'PUT', body: LAST_PART })

    assert.equal(refused.status, 403)

    // And the upload is still open: a new URL uploads the same part. It is what
    // `GET /storages/:id/parts` does for whoever was offline for hours.
    const renewed = item(
      await multipart.signParts(key, uploadId, [{ partNumber: 1, size: LAST_PART.byteLength }]),
      0,
    )

    await put(renewed.url, LAST_PART)

    assert.lengthOf(await multipart.listParts(key, uploadId), 1)

    await multipart.abort(key, uploadId)
  })
})
