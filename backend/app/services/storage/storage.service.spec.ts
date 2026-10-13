import { test } from '@japa/runner'
import Storage from '#models/storage'
import { UploadStatuses } from '#core/entity'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/helpers'
import type { UploadStatus } from '#core/entity'

/**
 * O arquivo como registro neutro e compartilhado: ele não pertence ao
 * formulário que o enviou, e a posse não autoriza nada. Quem manda é o estado
 * (`PENDING` ou `UPLOADED`) e a referência viva.
 */

/** Abre um upload pelo endpoint real e devolve o envelope. */

/** Envia uma parte para a URL assinada e devolve o `ETag`. */

/** O caminho completo, do zero ao `UPLOADED`, para um arquivo de parte única. */

/** Uma linha de `storages` sem binário nenhum: aqui só o metadado importa. */
function record(status: UploadStatus) {
  return Storage.create({
    filename: 'a3f1c0de-0000-4000-8000-000000000000.png',
    originalName: 'capa.png',
    mimetype: 'image/png',
    size: 1024,
    path: 'a3f1c0de-0000-4000-8000-000000000000.png',
    status,
  })
}

/**
 * `StorageService.assertExist` é o que separa "a linha existe" de "o arquivo
 * está íntegro". Desde que o binário sobe direto para o bucket, a
 * linha nasce antes do arquivo, e anexar um `PENDING` publicaria uma foto que
 * ainda está a meio caminho - a tela mostraria um 404.
 */
test.group('storages > anexar', (group) => {
  group.each.setup(() => resetDatabase())

  test('recusa com 422 anexar um arquivo ainda PENDING', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await record(UploadStatuses.PENDING)

    const response = await client.put('/account').cookies(session).json({ avatarId: storage.id })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })

  /**
   * O par do teste acima: sem ele, um `assertExist` que recusasse **tudo**
   * passaria pela recusa por vacuidade.
   */
  test('aceita o mesmo arquivo depois de ele estar UPLOADED', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await record(UploadStatuses.UPLOADED)

    const response = await client.put('/account').cookies(session).json({ avatarId: storage.id })

    response.assertStatus(200)
    assert.equal(body(response).avatar.id, storage.id)
  })
})
