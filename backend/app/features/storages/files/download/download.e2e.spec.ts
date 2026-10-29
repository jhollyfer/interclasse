import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import type { ApiClient } from '@japa/api-client'

import { StorageContract } from '#services/storage/storage.contract'
import { type StorageMimetype } from '#core/validator'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
  type ResponseBody,
} from '#tests/helpers'
import type { Session } from '#tests/helpers'

/**
 * O arquivo como registro neutro e compartilhado: ele não pertence ao
 * formulário que o enviou, e a posse não autoriza nada. Quem manda é o estado
 * (`PENDING` ou `UPLOADED`) e a referência viva.
 */

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

test.group('storages > download', (group) => {
  group.each.setup(() => resetDatabase())

  test('recusa quem não tem sessão', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    // Com o bucket privado, esta rota é o único caminho para o binário. Aberta,
    // ela emitia URL assinada para qualquer uuid sem sessão - a porta dos
    // fundos que o fechamento do bucket deixou aberta.
    const response = await client.get(`/storages/${storage.id}/download`).redirects(0)

    response.assertStatus(401)
  })

  test('redireciona para uma URL temporária do bucket', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    // Sem seguir o redirect, para ver o que a **aplicação** responde.
    const response = await client
      .get(`/storages/${storage.id}/download`)
      .cookies(session)
      .redirects(0)

    response.assertStatus(302)

    const location = response.header('location')

    // Assinada e temporária: nunca a URL crua e permanente do objeto.
    assert.include(location, 'X-Amz-Signature')
    assert.include(location, 'X-Amz-Expires')
  })

  test('o arquivo chega com o nome original no fim do redirect', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const response = await client.get(`/storages/${storage.id}/download`).cookies(session)

    response.assertStatus(200)

    const disposition = response.header('content-disposition')

    assert.include(disposition, 'attachment')
    // Os dois nomes, como pede a RFC 6266.
    assert.include(disposition, 'filename="capa.png"')
    assert.include(disposition, "filename*=UTF-8''capa.png")
  })

  test('o conselheiro não baixa arquivo que não é dele: só o administrador opera o acervo', async ({
    client,
  }) => {
    const administrador = await authenticateAsAdministrator(client)
    const storage = await upload(client, administrador)

    const conselheiro = await authenticateAsAdvisor(client)

    const response = await client
      .get(`/storages/${storage.id}/download`)
      .cookies(conselheiro)
      .redirects(0)

    response.assertStatus(404)
  })

  test('responde 404 para id inexistente', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client
      .get('/storages/00000000-0000-4000-8000-000000000000/download')
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })
})

/**
 * O header que faz o arquivo chegar com o nome que a pessoa enviou.
 *
 * A RFC 6266 pede os dois nomes: `filename=` só carrega ASCII, e
 * `filename*=UTF-8''` é o que preserva acento. Mandar só um deles quebra
 * metade dos clientes.
 */
test.group('storages > contentDisposition', () => {
  test('mantém o acento na versão UTF-8 e o remove na ASCII', async ({ assert }) => {
    const service = await app.container.make(StorageContract)

    const header = service.contentDisposition('Relatório Anual.pdf')

    assert.include(header, 'filename="Relatorio Anual.pdf"')
    assert.include(header, "filename*=UTF-8''Relat%C3%B3rio%20Anual.pdf")
  })

  test('neutraliza aspas, que escapariam do header', async ({ assert }) => {
    const service = await app.container.make(StorageContract)

    const header = service.contentDisposition('nota "final".pdf')

    assert.include(header, 'filename="nota _final_.pdf"')
  })
})
