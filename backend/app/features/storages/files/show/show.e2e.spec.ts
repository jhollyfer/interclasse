import { test } from '@japa/runner'
import { UPLOAD_STATUS } from '@interclasse/shared'

import { storageRow } from '#tests/storages-fixtures'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/http-fixtures'

/**
 * O arquivo como registro neutro e compartilhado: ele não pertence ao
 * formulário que o enviou, e a posse não autoriza nada. Quem manda é o estado
 * (`PENDING` ou `UPLOADED`) e a referência viva.
 */

/** Abre um upload pelo endpoint real e devolve o envelope. */

/** Envia uma parte para a URL assinada e devolve o `ETag`. */

/** O caminho completo, do zero ao `UPLOADED`, para um arquivo de parte única. */

/** Uma linha de `storages` sem binário nenhum: aqui só o metadado importa. */

test.group('storages > detalhe', (group) => {
  group.each.setup(() => resetDatabase())

  test('responde 200 com a url derivada', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await storageRow()

    const response = await client.get(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).id, storage.id)
    assert.equal(body(response).originalName, 'capa.png')
    // Não é coluna: o hook do model a resolve na leitura a partir de `path`.
    assert.include(body(response).url, storage.path)
  })

  test('alcança o upload ainda PENDING', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await storageRow({ status: UPLOAD_STATUS.PENDING })

    // A tela de detalhe é onde se descobre que um upload ficou pela metade.
    // Quem exige `UPLOADED` é o anexo, não a leitura.
    const response = await client.get(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).status, 'PENDING')
  })

  test('id inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .get('/storages/00000000-0000-4000-8000-000000000000')
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })

  test('id malformado responde 422 em vez de 500 do Postgres', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/storages/nao-e-uuid').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })
})

test.group('storages > detalhe > acesso', (group) => {
  group.each.setup(() => resetDatabase())

  test('sem sessão responde 401', async ({ client }) => {
    const storage = await storageRow()

    const response = await client.get(`/storages/${storage.id}`)

    response.assertStatus(401)
  })
})
