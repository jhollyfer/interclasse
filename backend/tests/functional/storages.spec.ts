import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import Storage from '#models/storage'
import StorageService from '#services/storage/storage.service'
import MultipartService, { PART_SIZE } from '#services/multipart/multipart.service'
import StoragesPrune from '../../commands/storages-prune.command.ts'
import { DateTime } from 'luxon'
import { UploadStatuses } from '#core/entity'
import { StorageCreateValidator } from '#features/storages/storages.validator'
import { UPLOAD_MAX_SIZE, type StorageMimetype } from '#core/validator'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '../helpers.ts'
import type { ApiClient } from '@japa/api-client'
import type { UploadStatus } from '#core/entity'
import type { Session } from '../helpers.ts'

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
  payload: { fileName: string; mimetype: StorageMimetype; size: number }
): Promise<Record<string, any>> {
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
async function upload(client: ApiClient, session: Session): Promise<Record<string, any>> {
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
      StorageCreateValidator.validate({
        fileName: 'script.sh',
        mimetype: 'application/x-sh',
        size: 128,
      })
    )
  })

  /**
   * Contra o teto do ambiente, e não contra um número escrito aqui: desde que
   * `UPLOAD_MAX_SIZE` é exigida, este teste continua valendo qualquer
   * que seja o valor configurado.
   */
  test('recusa tamanho acima do teto do ambiente', async ({ assert }) => {
    await assert.rejects(() =>
      StorageCreateValidator.validate({
        fileName: 'gigante.pdf',
        mimetype: 'application/pdf',
        size: UPLOAD_MAX_SIZE + 1,
      })
    )
  })

  test('aceita o tamanho no teto', async ({ assert }) => {
    const payload = await StorageCreateValidator.validate({
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
      [1, 2, 3]
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

    const stored = await Storage.findOrFail(opened.storage.id)
    assert.strictEqual(stored.size, size)
  })

  test('exige sessão', async ({ client }) => {
    const response = await client
      .post('/storages')
      .json({ fileName: 'a.png', mimetype: 'image/png', size: 1 })

    response.assertStatus(401)
  })
})

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
      [1, 2]
    )
    assert.deepEqual(
      resumed.parts.map((part: { partNumber: number }) => part.partNumber),
      [3]
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
    const service = await app.container.make(StorageService)

    const header = service.contentDisposition('Relatório Anual.pdf')

    assert.include(header, 'filename="Relatorio Anual.pdf"')
    assert.include(header, "filename*=UTF-8''Relat%C3%B3rio%20Anual.pdf")
  })

  test('neutraliza aspas, que escapariam do header', async ({ assert }) => {
    const service = await app.container.make(StorageService)

    const header = service.contentDisposition('nota "final".pdf')

    assert.include(header, 'filename="nota _final_.pdf"')
  })
})

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

/**
 * Uma linha com os metadados escolhidos, para os testes de listagem.
 *
 * Separada do `record(status)` acima porque aquele fixa `originalName` e
 * `mimetype`, que são justamente as colunas que a busca e os filtros recortam.
 * `filename` sai aleatório para não repetir a mesma chave de bucket em duas
 * linhas.
 */
function linha(attributes: Partial<Storage> = {}) {
  const filename = `${randomUUID()}.png`

  return Storage.create({
    filename,
    originalName: 'capa.png',
    mimetype: 'image/png',
    size: 1024,
    path: filename,
    status: UploadStatuses.UPLOADED,
    ...attributes,
  })
}

/**
 * A biblioteca de arquivos do painel: `GET /storages` e `GET /storages/:id`.
 *
 * `backend-old` servia as duas em `/storage/paginate` e `/storage/:id`, e as
 * telas que as consomem sobreviveram à migração. O que se afirma aqui é o que a
 * consulta faz antes de paginar - a ordem padrão, os dois filtros e o escopo da
 * busca - e que o detalhe alcança também o upload pela metade.
 */
test.group('storages > listagem', (group) => {
  group.each.setup(() => resetDatabase())

  test('a ordem padrão é do mais recente para o mais antigo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const antigo = await linha({ originalName: 'antigo.png' })
    const recente = await linha({ originalName: 'recente.png' })

    // `createdAt` sai do `autoCreate` e as duas linhas nascem no mesmo
    // milissegundo: sem afastá-las, a ordem seria a do banco e o teste passaria
    // com qualquer `orderBy`.
    await antigo.merge({ createdAt: DateTime.now().minus({ days: 2 }) }).save()

    const response = await client.get('/storages').cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((item: Record<string, any>) => item.id),
      [recente.id, antigo.id]
    )
    // A página 1 com 20 itens é o padrão de todo recurso do painel.
    assert.equal(body(response).meta.currentPage, 1)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('?status recorta o upload em aberto', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    await linha()
    const pendente = await linha({ status: UploadStatuses.PENDING })

    const response = await client.get('/storages').qs({ status: 'PENDING' }).cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, pendente.id)
  })

  test('?mimetype recorta um tipo só', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    await linha()
    const pdf = await linha({ mimetype: 'application/pdf' })

    const response = await client
      .get('/storages')
      .qs({ mimetype: 'application/pdf' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, pdf.id)
  })

  test('?search não escapa do filtro de status', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const confirmado = await linha({ originalName: 'contrato.pdf' })
    // Casa a busca pelo **mimetype**, e não pelo nome original, e está
    // `PENDING`: com o `OR` solto ele apareceria mesmo com `?status=UPLOADED`,
    // porque o `OR` anula o `AND` anterior. O termo tem de cair numa coluna
    // depois da primeira, senão o `OR` agrupado e o solto respondem igual e o
    // teste não mede nada.
    await linha({
      originalName: 'sem-o-termo-no-nome.png',
      mimetype: 'application/pdf',
      status: UploadStatuses.PENDING,
    })

    const response = await client
      .get('/storages')
      .qs({ search: 'pdf', status: 'UPLOADED' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, confirmado.id)
  })

  test('?sort fora da tupla fechada responde 422 apontando o campo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    // `path` é coluna de `storages`, mas não é coluna de ordenação: o valor iria
    // direto para o `orderBy` e comporia SQL.
    //
    // A query vai na própria URL, e não em `.qs()`: o registry do Tuyau tipa o
    // objeto pela tupla fechada, e o valor inválido que este teste existe para
    // mandar não compilaria.
    const response = await client.get('/storages?sort=path').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'sort')
  })

  test('sem sessão responde 401', async ({ client }) => {
    const response = await client.get('/storages')

    response.assertStatus(401)
  })
})

test.group('storages > detalhe', (group) => {
  group.each.setup(() => resetDatabase())

  test('responde 200 com a url derivada', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await linha()

    const response = await client.get(`/storages/${storage.id}`).cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).id, storage.id)
    assert.equal(body(response).originalName, 'capa.png')
    // Não é coluna: o hook do model a resolve na leitura a partir de `path`.
    assert.include(body(response).url, storage.path)
  })

  test('alcança o upload ainda PENDING', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await linha({ status: UploadStatuses.PENDING })

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
