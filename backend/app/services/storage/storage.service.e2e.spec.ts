import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'

import { StorageContract } from '#services/storage/storage.contract'
import { pngBytes } from '#tests/storages-fixtures'

/**
 * O adaptador real do bucket contra o S3 local (`_standards/architecture.md` §8):
 * a chave sai do tipo, e os bytes, o tamanho e a URL assinada vêm do objeto gravado.
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

  test('a chave leva a extensão do tipo e nunca repete', ({ assert }) => {
    const first = storage.key('image/png')

    assert.match(first, /^[0-9a-f-]{36}\.png$/)
    assert.notEqual(first, storage.key('image/png'))
  })

  test('metadata e head leem o objeto gravado', async ({ assert }) => {
    const path = storage.key('image/png')
    written.push(path)
    await drive.use().put(path, pngBytes(2048), { contentType: 'image/png' })

    const metadata = await storage.metadata(path)
    const head = await storage.head(path)

    assert.equal(metadata.contentLength, 2048)
    assert.lengthOf(head, 12)
  })

  test('a URL assinada de leitura entrega o objeto', async ({ assert }) => {
    const path = storage.key('image/png')
    written.push(path)
    await drive.use().put(path, pngBytes(512), { contentType: 'image/png' })

    const response = await fetch(await storage.signedUrl(path))

    assert.equal(response.status, 200)
    const received = await response.arrayBuffer()

    assert.equal(received.byteLength, 512)
  })

  test('o download assinado leva o nome original no Content-Disposition', async ({ assert }) => {
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

  test('discard apaga o binário do bucket', async ({ assert }) => {
    const path = storage.key('image/png')
    await drive.use().put(path, pngBytes(128), { contentType: 'image/png' })

    await storage.discard(path)

    assert.isFalse(await drive.use().exists(path))
  })
})
