import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { STORAGE_EXTENSIONS, STORAGE_MIMETYPES } from '@interclasse/shared'

import { StorageContract } from '#services/storage/storage.contract'

async function service(): Promise<StorageContract> {
  return app.container.make(StorageContract)
}

test.group('services > storage (unit)', () => {
  test('the key is a uuid with the type extension, for each accepted type', async ({ assert }) => {
    const storage = await service()

    for (const mimetype of STORAGE_MIMETYPES) {
      assert.match(
        storage.key(mimetype),
        new RegExp(`^[0-9a-f-]{36}\\.${STORAGE_EXTENSIONS[mimetype]}$`),
      )
    }
  })

  test('two keys of the same type never coincide', async ({ assert }) => {
    const storage = await service()

    assert.notEqual(storage.key('image/png'), storage.key('image/png'))
  })

  test('Content-Disposition carries the ASCII name and the encoded UTF-8 one', async ({
    assert,
  }) => {
    const storage = await service()

    const header = storage.contentDisposition('relatório final.pdf')

    assert.equal(
      header,
      `attachment; filename="relatorio final.pdf"; filename*=UTF-8''relat%C3%B3rio%20final.pdf`,
    )
  })

  test('quotes and slash in the name become _ so they do not escape the header value', async ({
    assert,
  }) => {
    const storage = await service()

    const header = storage.contentDisposition('a"b\\c.png')

    assert.include(header, 'filename="a_b_c.png"')
  })

  test('withUrl returns the record with the signed URL of its own path', async ({ assert }) => {
    const storage = await service()

    const signed = await storage.withUrl({ path: 'a/b.png', originalName: 'b.png' })

    assert.equal(signed.originalName, 'b.png')
    assert.equal(signed.url.split('?')[0]?.endsWith('/a/b.png'), true)
  })

  test('the signed read URL is computed locally and expires', async ({ assert }) => {
    const storage = await service()

    const url = new URL(await storage.signedUrl('abc.png'))

    assert.isTrue(url.searchParams.has('X-Amz-Signature'))
    assert.isTrue(url.searchParams.has('X-Amz-Expires'))
  })

  test('the signed download binds the original name to the signature', async ({ assert }) => {
    const storage = await service()

    const url = new URL(
      await storage.signedDownload({
        path: 'abc.png',
        mimetype: 'image/png',
        originalName: 'foto.png',
      }),
    )

    assert.include(url.searchParams.get('response-content-disposition') ?? '', 'foto.png')
  })
})
