import { test } from '@japa/runner'
import drive from '@adonisjs/drive/services/main'
import type { ApiClient } from '@japa/api-client'

import Storage from '#models/storage'
import { PART_SIZE } from '#services/multipart/multipart.contract'
import { type StorageMimetype } from '#core/validator'
import { authenticateAsAdministrator, body, resetDatabase, type ResponseBody } from '#tests/helpers'
import type { Session } from '#tests/helpers'

/**
 * O arquivo como registro neutro e compartilhado: ele não pertence ao
 * formulário que o enviou, e a posse não autoriza nada. Quem manda é o estado
 * (`PENDING` ou `UPLOADED`) e a referência viva.
 */

/**
 * Conteúdo de uma parte não-final. O S3 recusa menos de 5 MB
 * (`EntityTooSmall`), e `PART_SIZE` é o que o servidor promete por parte.
 */
const FULL_PART = new Uint8Array(PART_SIZE).fill(65)

const SMALL = new Uint8Array(1024).fill(66)

/** Abre um upload pelo endpoint real e devolve o envelope. */
async function open(
  client: ApiClient,
  session: Session,
  payload: { fileName: string; mimetype: StorageMimetype; size: number },
): Promise<ResponseBody> {
  const response = await client.post('/storages').cookies(session).json(payload)

  response.assertStatus(201)

  return body(response)
}

/** Envia uma parte para a URL assinada e devolve o `ETag`. */
async function put(url: string, content: Uint8Array): Promise<string> {
  const response = await fetch(url, {
    method: 'PUT',
    body: content,
    headers: { 'Content-Type': 'image/png' },
  })

  if (!response.ok) throw new Error(`PUT respondeu ${response.status}`)

  return response.headers.get('etag') ?? ''
}

/** O caminho completo, do zero ao `UPLOADED`, para um arquivo de parte única. */
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

/** Uma linha de `storages` sem binário nenhum: aqui só o metadado importa. */

test.group('storages > complete', (group) => {
  group.each.setup(() => resetDatabase())

  test('confirma o upload e o arquivo passa a UPLOADED', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    assert.equal(storage.status, 'UPLOADED')
    assert.isTrue(await drive.use().exists(storage.path))
  })

  test('remonta as partes de um multipart', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const size = PART_SIZE + SMALL.byteLength

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size,
    })

    const parts = [
      { partNumber: 1, etag: await put(opened.parts[0].url, FULL_PART) },
      { partNumber: 2, etag: await put(opened.parts[1].url, SMALL) },
    ]

    const response = await client
      .post(`/storages/${opened.storage.id}/complete`)
      .cookies(session)
      .json({ parts })

    response.assertStatus(200)

    const metadata = await drive.use().getMetaData(opened.storage.path)

    assert.equal(metadata.contentLength, size)
    // O `uploadId` é zerado: a conversa com o bucket acabou, e guardar o
    // ponteiro dela só manteria vivo um endereço que não leva a lugar nenhum.
    assert.isNull(body(response).uploadId)
  })

  test('recusa com 422 quando o que subiu não tem o tamanho declarado', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    // Declara mil bytes e sobe dez: é a mentira que o `complete` existe para
    // pegar, já que os bytes não passam pela aplicação.
    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: 1000,
    })

    await put(opened.parts[0].url, new Uint8Array(10))

    const response = await client
      .post(`/storages/${opened.storage.id}/complete`)
      .cookies(session)
      .json({})

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_SIZE_MISMATCH')

    // Recusado é recusado: nem a linha nem o binário sobrevivem, e o registro
    // nunca chega a `UPLOADED`.
    assert.isNull(await Storage.find(opened.storage.id))
    assert.isFalse(await drive.use().exists(opened.storage.path))
  })

  test('confirmar duas vezes devolve o mesmo registro', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const again = await client.post(`/storages/${storage.id}/complete`).cookies(session).json({})

    again.assertStatus(200)
    assert.equal(body(again).id, storage.id)
    assert.equal(body(again).status, 'UPLOADED')
  })
})
