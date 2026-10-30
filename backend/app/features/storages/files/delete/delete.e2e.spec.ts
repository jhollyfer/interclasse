import { test } from '@japa/runner'
import drive from '@adonisjs/drive/services/main'
import type { ApiClient } from '@japa/api-client'
import type { StorageMimetype } from '@interclasse/shared'

import Storage from '#models/storage'
import { StorageFactory } from '#database/factories/storage.factory'
import { PART_SIZE } from '#services/multipart/multipart.contract'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  type ResponseBody,
} from '#tests/http-fixtures'
import type { Session } from '#tests/http-fixtures'
import { pngBytes } from '#tests/storages-fixtures'

/**
 * O arquivo como registro neutro e compartilhado: ele não pertence ao
 * formulário que o enviou, e a posse não autoriza nada. Quem manda é o estado
 * (`PENDING` ou `UPLOADED`) e a referência viva.
 */

/**
 * Conteúdo de uma parte não-final. O S3 recusa menos de 5 MB
 * (`EntityTooSmall`), e `PART_SIZE` é o que o servidor promete por parte.
 */
const FULL_PART = pngBytes(PART_SIZE, 65)

const SMALL = pngBytes(1024)

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

test.group('storages > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('apaga o arquivo órfão, e o binário some do bucket junto', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    // O binário existe antes: sem esta asserção, um `delete` que não apagasse
    // nada passaria pela de baixo por vacuidade.
    assert.isTrue(await drive.use().exists(storage.path))

    const response = await client.delete(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(204)

    assert.isNull(await Storage.find(storage.id))
    assert.isFalse(await drive.use().exists(storage.path))
  })

  test('cancela um upload em andamento e descarta as partes', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size: PART_SIZE * 2,
    })

    await put(opened.parts[0].url, FULL_PART)

    const response = await client.delete(`/storages/${opened.storage.id}`).cookies(session)

    response.assertStatus(204)

    assert.isNull(await Storage.find(opened.storage.id))
    // O upload deixou de existir: pedir a retomada dele agora é 404.
    const resumed = await client.get(`/storages/${opened.storage.id}/parts`).cookies(session)
    resumed.assertStatus(404)
  })

  test('recusa com 409 o arquivo em uso como avatar', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const linked = await client.put('/account').cookies(session).json({ avatarId: storage.id })
    linked.assertStatus(200)

    const response = await client.delete(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'STORAGE_IN_USE')

    // O 409 não pode ser um "apagou e reclamou": registro e binário seguem lá.
    assert.isNotNull(await Storage.find(storage.id))
    assert.isTrue(await drive.use().exists(storage.path))
  })

  test('recusa com 409 o arquivo em uso como foto da galeria', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const photo = await client
      .post('/administrator/photos')
      .cookies(session)
      .json({ storageId: storage.id })
    photo.assertStatus(201)

    const response = await client.delete(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'STORAGE_IN_USE')
    assert.isNotNull(await Storage.find(storage.id))
  })

  test('recusa com 409 o arquivo em uso como regulamento do site', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const pdf = await StorageFactory.merge({ mimetype: 'application/pdf' }).create()

    const linked = await client
      .put('/administrator/site')
      .cookies(session)
      .json({ regulationId: pdf.id })
    linked.assertStatus(200)

    const response = await client.delete(`/storages/${pdf.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'STORAGE_IN_USE')
    assert.isNotNull(await Storage.find(pdf.id))
  })

  test('volta a aceitar depois de o anexo ser desvinculado', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    await client.put('/account').cookies(session).json({ avatarId: storage.id })
    await client.put('/account').cookies(session).json({ avatarId: null })

    const response = await client.delete(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(204)
    assert.isNull(await Storage.find(storage.id))
  })

  test('responde 404 para id inexistente', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .delete('/storages/00000000-0000-4000-8000-000000000000')
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })

  test('exige sessão', async ({ client }) => {
    const response = await client.delete('/storages/00000000-0000-4000-8000-000000000000')

    response.assertStatus(401)
  })
})
