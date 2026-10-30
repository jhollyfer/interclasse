import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import type { StorageMimetype } from '@interclasse/shared'

import { PART_SIZE } from '#services/multipart/multipart.contract'
import { StoragesFileCreateValidator } from '#validators/storages/files.validator'
import { UPLOAD_MAX_SIZE } from '#validators/storages/files.validator'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  type ResponseBody,
} from '#tests/http-fixtures'
import { Stored } from '#tests/stored-fixtures'
import type { Session } from '#tests/http-fixtures'

/**
 * O arquivo como registro neutro e compartilhado: ele não pertence ao
 * formulário que o enviou, e a posse não autoriza nada. Quem manda é o estado
 * (`PENDING` ou `UPLOADED`) e a referência viva.
 */

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

/** O caminho completo, do zero ao `UPLOADED`, para um arquivo de parte única. */

/** Uma linha de `storages` sem binário nenhum: aqui só o metadado importa. */

/**
 * O que é recusado **antes** de qualquer assinatura.
 *
 * Direto no validator, e não pelo HTTP, porque é aí que a recusa acontece: o
 * controller valida antes de chamar o use-case, e o use-case é o único que fala
 * com o bucket. Arquivo proibido não ganha URL, então não chega ao bucket.
 */
test.group('storages > validator', () => {
  test('recusa mimetype fora da lista', async ({ assert }) => {
    await assert.rejects(() =>
      StoragesFileCreateValidator.validate({
        fileName: 'script.sh',
        mimetype: 'application/x-sh',
        size: 128,
      }),
    )
  })

  /**
   * Contra o teto do ambiente, e não contra um número escrito aqui: desde que
   * `UPLOAD_MAX_SIZE` é exigida, este teste continua valendo qualquer
   * que seja o valor configurado.
   */
  test('recusa tamanho acima do teto do ambiente', async ({ assert }) => {
    await assert.rejects(() =>
      StoragesFileCreateValidator.validate({
        fileName: 'gigante.pdf',
        mimetype: 'application/pdf',
        size: UPLOAD_MAX_SIZE + 1,
      }),
    )
  })

  test('aceita o tamanho no teto', async ({ assert }) => {
    const payload = await StoragesFileCreateValidator.validate({
      fileName: 'grande.pdf',
      mimetype: 'application/pdf',
      size: UPLOAD_MAX_SIZE,
    })

    assert.equal(payload.size, UPLOAD_MAX_SIZE)
  })
})

test.group('storages > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('arquivo que cabe numa parte ganha uma URL só, sem uploadId', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: 2 * 1024 * 1024,
    })

    assert.isNull(opened.uploadId)
    assert.equal(opened.totalParts, 1)
    assert.lengthOf(opened.parts, 1)
    assert.equal(opened.storage.status, 'PENDING')
    // O nome enviado é rótulo, nunca caminho: a chave é uuid + extensão
    // derivada do mimetype.
    assert.equal(opened.storage.originalName, 'capa.png')
    assert.notInclude(opened.storage.path, 'capa')
    assert.match(opened.storage.path, /\.png$/)
  })

  test('arquivo maior é fatiado, e o número de URLs sai do tamanho', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    // Duas partes cheias e uma sobra: o `ceil` tem de contar a sobra.
    const opened = await open(client, session, {
      fileName: 'edital.pdf',
      mimetype: 'application/pdf',
      size: PART_SIZE * 2 + 1,
    })

    assert.isNotNull(opened.uploadId)
    assert.equal(opened.totalParts, 3)
    assert.equal(opened.partSize, PART_SIZE)
    assert.deepEqual(
      opened.parts.map((part: { partNumber: number }) => part.partNumber),
      [1, 2, 3],
    )
  })

  /**
   * O `size` é `bigint` no banco. Com `integer`, este `POST` passaria na
   * validação - o teto do ambiente permite - e estouraria no `INSERT`, porque
   * `int4` para em 2,1 GB. O teste declara 4 GiB e não transfere nada: só o
   * metadado viaja, e a linha nasce `PENDING`.
   *
   * A asserção sobre o envelope é o fio: o driver devolve `int8` como string, e
   * sem o `consume` do model o `size` sairia entre aspas.
   */
  test('aceita tamanho acima do teto de int4', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const size = 4 * 1024 ** 3

    const opened = await open(client, session, {
      fileName: 'acervo.pdf',
      mimetype: 'application/pdf',
      size,
    })

    assert.strictEqual(opened.storage.size, size)

    const stored = await Stored.storageOrFail(opened.storage.id)
    assert.strictEqual(stored.size, size)
  })

  test('exige sessão', async ({ client }) => {
    const response = await client
      .post('/storages')
      .json({ fileName: 'a.png', mimetype: 'image/png', size: 1 })

    response.assertStatus(401)
  })
})

test.group('storages > create > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('tipo fora da lista responde 422 apontando o campo, e nenhuma linha nasce', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/storages')
      .cookies(session)
      .json({ fileName: 'script.sh', mimetype: 'application/x-sh', size: 128 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'mimetype')
    assert.lengthOf(await Stored.storages(), 0)
  })
})
