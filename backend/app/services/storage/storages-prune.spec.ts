import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import { DateTime } from 'luxon'
import type { ApiClient } from '@japa/api-client'

import Storage from '#models/storage'
import MultipartService, { PART_SIZE } from '#services/multipart/multipart.service'
import StoragesPrune from '#commands/storages-prune.command'
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

/**
 * A varredura de `PENDING` abandonado (`node ace storages:prune`).
 *
 * `PENDING` é o único estado do qual não se sai sozinho: quem fecha a aba no
 * meio do upload nunca chama o `complete` nem o `DELETE`, e a linha fica de pé
 * com as partes penduradas no bucket, invisíveis na listagem de objetos e
 * cobradas mesmo assim. É o comando que fecha a máquina de estado.
 */
test.group('storages > prune', (group) => {
  group.each.setup(() => resetDatabase())

  /** Envelhece a linha no banco: é a idade que o comando usa para decidir. */
  async function age(id: string, hours: number): Promise<void> {
    await Storage.query()
      .where('id', id)
      .update({ created_at: DateTime.now().minus({ hours }).toSQL() })
  }

  async function prune(...args: Array<string>) {
    const ace = await app.container.make('ace')
    const command = await ace.create(StoragesPrune, args)

    await command.exec()

    return command
  }

  test('apaga o PENDING velho e aborta o multipart dele', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const multipart = await app.container.make(MultipartService)

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size: PART_SIZE + SMALL.byteLength,
    })

    // Uma parte sobe e a outra não: é o abandono no meio do caminho, e são
    // essas partes órfãs que só o aborto alcança.
    await put(opened.parts[0].url, FULL_PART)
    await age(opened.storage.id, 48)

    const command = await prune()

    command.assertSucceeded()

    assert.isNull(await Storage.find(opened.storage.id))
    // Listar as partes de um upload abortado é erro, e não lista vazia - é a
    // diferença entre "abortado" e "aberto e sem parte nenhuma".
    await assert.rejects(() => multipart.listParts(opened.storage.path, opened.uploadId))
  })

  test('não toca no PENDING recente', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    const command = await prune()

    command.assertSucceeded()

    assert.isNotNull(await Storage.find(opened.storage.id))
  })

  test('não toca no UPLOADED, por mais velho que seja', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    await age(storage.id, 24 * 365)

    const command = await prune()

    command.assertSucceeded()

    assert.isNotNull(await Storage.find(storage.id))
    assert.isTrue(await drive.use().exists(storage.path))
  })

  test('--hours ajusta o corte', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    await age(opened.storage.id, 2)

    // Sobrevive ao padrão de 24h e não sobrevive a um corte de uma hora.
    await prune()
    assert.isNotNull(await Storage.find(opened.storage.id))

    await prune('--hours=1')
    assert.isNull(await Storage.find(opened.storage.id))
  })

  test('--dry-run lista sem apagar', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    await age(opened.storage.id, 48)

    const command = await prune('--dry-run')

    command.assertSucceeded()

    assert.isNotNull(await Storage.find(opened.storage.id))
  })
})
