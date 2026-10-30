import { test } from '@japa/runner'

import { Storage } from './storage.entity.ts'

const NOW = new Date('2026-10-29T12:00:00Z')

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

function pending(): Storage {
  return Storage.open({
    id: 'id',
    key: 'abc.png',
    originalName: 'capa.png',
    mimetype: 'image/png',
    size: 1024,
    uploadId: 'upload',
    partSize: 10,
    now: NOW,
  })
}

test.group('Storage', () => {
  test('nasce PENDING com a chave como caminho', ({ assert }) => {
    const file = pending()

    assert.deepInclude(file.snapshot(), {
      status: 'PENDING',
      path: 'abc.png',
      filename: 'abc.png',
      uploadId: 'upload',
    })
    assert.isTrue(file.isPending())
  })

  test('confirma quando o tamanho que subiu é o declarado e solta o uploadId', ({ assert }) => {
    const file = pending()

    const result = file.complete({ contentLength: 1024, head: PNG }, NOW)

    assert.isTrue(result.isRight())
    assert.deepInclude(file.snapshot(), { status: 'UPLOADED', uploadId: null })
  })

  test('tamanho diferente do declarado é STORAGE_SIZE_MISMATCH e não confirma', ({ assert }) => {
    const file = pending()

    const result = file.complete({ contentLength: 10, head: PNG }, NOW)

    assert.deepEqual(result.value, {
      code: 'STORAGE_SIZE_MISMATCH',
      declared: 1024,
      received: 10,
    })
    assert.isTrue(file.isPending())
  })

  test('conteúdo que não é do tipo declarado é STORAGE_CONTENT_MISMATCH e não confirma', ({
    assert,
  }) => {
    const file = pending()
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')

    const result = file.complete({ contentLength: 1024, head: svg.subarray(0, 12) }, NOW)

    assert.deepEqual(result.value, { code: 'STORAGE_CONTENT_MISMATCH', mimetype: 'image/png' })
    assert.isTrue(file.isPending())
  })

  test('confirmar de novo é idempotente, mesmo com outro tamanho', ({ assert }) => {
    const file = pending()
    file.complete({ contentLength: 1024, head: PNG }, NOW)

    const again = file.complete({ contentLength: 1, head: PNG }, NOW)

    assert.isTrue(again.isRight())
    assert.isTrue(file.isUploaded())
  })

  test('PENDING sai sempre; UPLOADED só sem uso', ({ assert }) => {
    const free = pending()
    const used = pending()
    used.complete({ contentLength: 1024, head: PNG }, NOW)

    assert.isTrue(free.remove(['avatar de usuário']).isRight())
    assert.deepEqual(used.remove(['avatar de usuário']).value, {
      code: 'STORAGE_IN_USE',
      usedBy: ['avatar de usuário'],
    })
    assert.isTrue(used.remove([]).isRight())
  })
})
