import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { STORAGE_EXTENSIONS, STORAGE_MIMETYPES } from '@interclasse/shared'

import { StorageContract } from '#services/storage/storage.contract'

async function service(): Promise<StorageContract> {
  return app.container.make(StorageContract)
}

test.group('services > storage (unit)', () => {
  test('a chave é um uuid com a extensão do tipo, para cada tipo aceito', async ({ assert }) => {
    const storage = await service()

    for (const mimetype of STORAGE_MIMETYPES) {
      assert.match(
        storage.key(mimetype),
        new RegExp(`^[0-9a-f-]{36}\\.${STORAGE_EXTENSIONS[mimetype]}$`),
      )
    }
  })

  test('duas chaves do mesmo tipo nunca coincidem', async ({ assert }) => {
    const storage = await service()

    assert.notEqual(storage.key('image/png'), storage.key('image/png'))
  })

  test('o Content-Disposition leva o nome ASCII e o UTF-8 codificado', async ({ assert }) => {
    const storage = await service()

    const header = storage.contentDisposition('relatório final.pdf')

    assert.equal(
      header,
      `attachment; filename="relatorio final.pdf"; filename*=UTF-8''relat%C3%B3rio%20final.pdf`,
    )
  })

  test('aspas e barra do nome viram _ para não escapar do valor do header', async ({ assert }) => {
    const storage = await service()

    const header = storage.contentDisposition('a"b\\c.png')

    assert.include(header, 'filename="a_b_c.png"')
  })

  test('withUrl devolve o registro com a URL assinada do próprio path', async ({ assert }) => {
    const storage = await service()

    const signed = await storage.withUrl({ path: 'a/b.png', originalName: 'b.png' })

    assert.equal(signed.originalName, 'b.png')
    assert.equal(signed.url.split('?')[0]?.endsWith('/a/b.png'), true)
  })

  test('a URL assinada de leitura é calculada localmente e vence', async ({ assert }) => {
    const storage = await service()

    const url = new URL(await storage.signedUrl('abc.png'))

    assert.isTrue(url.searchParams.has('X-Amz-Signature'))
    assert.isTrue(url.searchParams.has('X-Amz-Expires'))
  })

  test('o download assinado prende o nome original na assinatura', async ({ assert }) => {
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
