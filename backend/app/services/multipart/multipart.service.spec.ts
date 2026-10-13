import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'

import { MultipartContract } from '#services/multipart/multipart-contract.service'

/**
 * O multipart contra o bucket de verdade (o MinIO do `docker-compose.yml`).
 *
 * Contra o storage real e não contra um dublê porque é justamente o protocolo
 * que está sob teste: o mínimo de 5 MB por parte, o `ETag` que só vem no header
 * da resposta, a URL que expira e o `ListParts` que enxerga o que subiu. Um
 * dublê responderia o que eu programasse e não provaria nada disso.
 */

/**
 * O S3 recusa parte não-final com menos de 5 MB (`EntityTooSmall`), então a
 * primeira tem exatamente o mínimo. A segunda é minúscula de propósito: é a
 * última, e para ela não há mínimo.
 */
const FIRST_PART = new Uint8Array(5 * 1024 * 1024).fill(65)
const LAST_PART = new Uint8Array(1024).fill(66)

/** Envia uma parte para a URL assinada e devolve o `ETag` que o bucket deu. */
async function put(url: string, body: Uint8Array): Promise<string> {
  const response = await fetch(url, { method: 'PUT', body })

  if (!response.ok) {
    throw new Error(`PUT da parte respondeu ${response.status}`)
  }

  const etag = response.headers.get('etag')

  if (!etag) {
    throw new Error('bucket não devolveu ETag - o complete seria impossível')
  }

  return etag
}

/** O item na posição, ou falha o teste: lista mais curta que o esperado é o defeito. */
function item<T>(list: ReadonlyArray<T>, index: number): T {
  const found = list[index]
  if (found === undefined) throw new Error(`lista sem a posição ${index}`)
  return found
}

test.group('multipart', () => {
  test('sobe em partes, remonta, e o objeto final tem a soma dos tamanhos', async ({ assert }) => {
    const multipart = await app.container.make(MultipartContract)
    const key = `test-${randomUUID()}.bin`

    const uploadId = await multipart.initiate(key, 'application/octet-stream')
    const urls = await multipart.signParts(key, uploadId, [1, 2])

    assert.lengthOf(urls, 2)
    assert.deepEqual(
      urls.map((part) => part.partNumber),
      [1, 2],
    )

    const parts = [
      { partNumber: 1, etag: await put(item(urls, 0).url, FIRST_PART) },
      { partNumber: 2, etag: await put(item(urls, 1).url, LAST_PART) },
    ]

    // Antes do complete, nada existe na chave final: o que o bucket tem são as
    // partes, e é isso que a retomada enxerga.
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

  test('listParts enxerga só o que subiu, e é isso que a retomada usa', async ({ assert }) => {
    const multipart = await app.container.make(MultipartContract)
    const key = `test-${randomUUID()}.bin`

    const uploadId = await multipart.initiate(key, 'application/octet-stream')
    const first = item(await multipart.signParts(key, uploadId, [1]), 0)

    await put(first.url, FIRST_PART)

    const received = await multipart.listParts(key, uploadId)

    assert.deepEqual(
      received.map((part) => part.partNumber),
      [1],
    )

    await multipart.abort(key, uploadId)
  })

  test('abort descarta as partes, e nada fica ocupando o bucket', async ({ assert }) => {
    const multipart = await app.container.make(MultipartContract)
    const key = `test-${randomUUID()}.bin`

    const uploadId = await multipart.initiate(key, 'application/octet-stream')
    const first = item(await multipart.signParts(key, uploadId, [1]), 0)

    await put(first.url, FIRST_PART)
    await multipart.abort(key, uploadId)

    // O upload deixou de existir: listar as partes dele agora é erro, e não
    // lista vazia. É a diferença entre "abortado" e "aberto e sem partes".
    await assert.rejects(() => multipart.listParts(key, uploadId))
    assert.isFalse(await drive.use().exists(key))
  })

  test('URL assinada para de valer depois de expirar', async ({ assert }) => {
    const multipart = await app.container.make(MultipartContract)
    const key = `test-${randomUUID()}.bin`

    const uploadId = await multipart.initiate(key, 'application/octet-stream')
    const expiring = item(await multipart.signParts(key, uploadId, [1], 1), 0)

    await new Promise((resolve) => setTimeout(resolve, 1_500))

    const refused = await fetch(expiring.url, { method: 'PUT', body: LAST_PART })

    assert.equal(refused.status, 403)

    // E o upload continua aberto: uma URL nova sobe a mesma parte. É o que
    // `GET /storages/:id/parts` faz por quem ficou horas fora do ar.
    const renewed = item(await multipart.signParts(key, uploadId, [1]), 0)

    await put(renewed.url, LAST_PART)

    assert.lengthOf(await multipart.listParts(key, uploadId), 1)

    await multipart.abort(key, uploadId)
  })
})
