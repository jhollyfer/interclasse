import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'

import { StorageContract } from '#services/storage/storage.contract'
import { pngBytes } from '#tests/storages-fixtures'

/**
 * The real bucket adapter against local S3 (`_standards/architecture.md` §8):
 * the key comes from the type, and the bytes, size and signed URL come from the stored object.
 */
test.group('services > storage > bucket real', (group) => {
  let storage: StorageContract
  const written: Array<string> = []

  group.setup(async () => {
    storage = await app.container.make(StorageContract)
  })

  group.teardown(async () => {
    await Promise.all(written.map((path) => drive.use().delete(path)))
  })

  test('the key carries the type extension and never repeats', ({ assert }) => {
    const first = storage.key('image/png')

    assert.match(first, /^[0-9a-f-]{36}\.png$/)
    assert.notEqual(first, storage.key('image/png'))
  })

  test('metadata and head read the stored object', async ({ assert }) => {
    const path = storage.key('image/png')
    written.push(path)
    await drive.use().put(path, pngBytes(2048), { contentType: 'image/png' })

    const metadata = await storage.metadata(path)
    const head = await storage.head(path)

    assert.equal(metadata.contentLength, 2048)
    assert.lengthOf(head, 12)
  })

  test('the signed read URL delivers the object', async ({ assert }) => {
    const path = storage.key('image/png')
    written.push(path)
    await drive.use().put(path, pngBytes(512), { contentType: 'image/png' })

    const response = await fetch(await storage.signedUrl(path))

    assert.equal(response.status, 200)
    const received = await response.arrayBuffer()

    assert.equal(received.byteLength, 512)
  })

  test('the signed download carries the original name in Content-Disposition', async ({
    assert,
  }) => {
    const path = storage.key('image/png')
    written.push(path)
    await drive.use().put(path, pngBytes(256), { contentType: 'image/png' })

    const url = await storage.signedDownload({
      path,
      mimetype: 'image/png',
      originalName: 'relatório.png',
    })
    const response = await fetch(url)

    assert.equal(response.status, 200)
    assert.include(response.headers.get('content-disposition') ?? '', "filename*=UTF-8''")
  })

  test('discard deletes the binary from the bucket', async ({ assert }) => {
    const path = storage.key('image/png')
    await drive.use().put(path, pngBytes(128), { contentType: 'image/png' })

    await storage.discard(path)

    assert.isFalse(await drive.use().exists(path))
  })
})
