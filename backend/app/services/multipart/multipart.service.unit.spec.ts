import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'

import { MultipartContract } from '#services/multipart/multipart.contract'

async function service(): Promise<MultipartContract> {
  return app.container.make(MultipartContract)
}

/**
 * A assinatura é calculada localmente (SigV4), sem rede: o que se confere aqui é
 * o que a URL prende, e não o bucket (`_standards/backend.md` §5.4). O protocolo
 * contra o bucket real fica no `multipart.service.e2e.spec.ts`.
 */
test.group('services > multipart (unit)', () => {
  test('cada parte ganha a própria URL, com tipo e tamanho presos na assinatura', async ({
    assert,
  }) => {
    const multipart = await service()

    const parts = await multipart.signParts('abc.png', 'upload-1', [
      { partNumber: 1, size: 5 * 1024 * 1024 },
      { partNumber: 2, size: 1024 },
    ])

    assert.deepEqual(
      parts.map((part) => part.partNumber),
      [1, 2],
    )
    for (const part of parts) {
      const url = new URL(part.url)
      assert.equal(url.searchParams.get('uploadId'), 'upload-1')
      assert.include(url.searchParams.get('X-Amz-SignedHeaders') ?? '', 'content-length')
    }
  })

  test('o envio de parte única prende content-type e content-length', async ({ assert }) => {
    const multipart = await service()

    const url = new URL(await multipart.signSingle('abc.png', 'image/png', 1024))
    const signed = url.searchParams.get('X-Amz-SignedHeaders') ?? ''

    assert.include(signed, 'content-type')
    assert.include(signed, 'content-length')
  })

  test('a expiração pedida entra na URL', async ({ assert }) => {
    const multipart = await service()

    const url = new URL(await multipart.signSingle('abc.png', 'image/png', 1024, 120))

    assert.equal(url.searchParams.get('X-Amz-Expires'), '120')
  })
})
