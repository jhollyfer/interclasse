import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'

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

test.group('storages > parts', (group) => {
  group.each.setup(() => resetDatabase())

  test('lista o que subiu e assina só o que falta', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size: PART_SIZE * 2 + SMALL.byteLength,
    })

    assert.equal(opened.totalParts, 3)

    // Sobe as duas primeiras e "cai" antes da terceira.
    await put(opened.parts[0].url, FULL_PART)
    await put(opened.parts[1].url, FULL_PART)

    const response = await client.get(`/storages/${opened.storage.id}/parts`).cookies(session)

    response.assertStatus(200)

    const resumed = body(response)

    assert.deepEqual(
      resumed.uploaded.map((part: { partNumber: number }) => part.partNumber),
      [1, 2],
    )
    assert.deepEqual(
      resumed.parts.map((part: { partNumber: number }) => part.partNumber),
      [3],
    )
    assert.equal(resumed.totalParts, 3)
    assert.equal(resumed.partSize, PART_SIZE)
  })

  test('a URL devolvida sobe de verdade - reassinar não pode dar endereço quebrado', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size: PART_SIZE + SMALL.byteLength,
    })

    const response = await client.get(`/storages/${opened.storage.id}/parts`).cookies(session)

    await put(body(response).parts[0].url, FULL_PART)

    const after = await client.get(`/storages/${opened.storage.id}/parts`).cookies(session)

    assert.lengthOf(body(after).uploaded, 1)
  })

  test('arquivo já confirmado responde com as listas vazias', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const response = await client.get(`/storages/${storage.id}/parts`).cookies(session)

    response.assertStatus(200)
    assert.isEmpty(body(response).parts)
    assert.isEmpty(body(response).uploaded)
    assert.equal(body(response).storage.status, 'UPLOADED')
  })
})
