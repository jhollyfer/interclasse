import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { storageRow } from '#tests/storages-fixtures'
import { UploadStatuses } from '#core/entity'
import { authenticateAsAdministrator, body, resetDatabase, type ResponseBody } from '#tests/helpers'

/**
 * O arquivo como registro neutro e compartilhado: ele não pertence ao
 * formulário que o enviou, e a posse não autoriza nada. Quem manda é o estado
 * (`PENDING` ou `UPLOADED`) e a referência viva.
 */

/** Abre um upload pelo endpoint real e devolve o envelope. */

/** Envia uma parte para a URL assinada e devolve o `ETag`. */

/** O caminho completo, do zero ao `UPLOADED`, para um arquivo de parte única. */

/** Uma linha de `storages` sem binário nenhum: aqui só o metadado importa. */

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

    const antigo = await storageRow({ originalName: 'antigo.png' })
    const recente = await storageRow({ originalName: 'recente.png' })

    // `createdAt` sai do `autoCreate` e as duas linhas nascem no mesmo
    // milissegundo: sem afastá-las, a ordem seria a do banco e o teste passaria
    // com qualquer `orderBy`.
    await antigo.merge({ createdAt: DateTime.now().minus({ days: 2 }) }).save()

    const response = await client.get('/storages').cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((item: ResponseBody) => item.id),
      [recente.id, antigo.id],
    )
    // A página 1 com 20 itens é o padrão de todo recurso do painel.
    assert.equal(body(response).meta.currentPage, 1)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('?status recorta o upload em aberto', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    await storageRow()
    const pendente = await storageRow({ status: UploadStatuses.PENDING })

    const response = await client.get('/storages').qs({ status: 'PENDING' }).cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, pendente.id)
  })

  test('?mimetype recorta um tipo só', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    await storageRow()
    const pdf = await storageRow({ mimetype: 'application/pdf' })

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

    const confirmado = await storageRow({ originalName: 'contrato.pdf' })
    // Casa a busca pelo **mimetype**, e não pelo nome original, e está
    // `PENDING`: com o `OR` solto ele apareceria mesmo com `?status=UPLOADED`,
    // porque o `OR` anula o `AND` anterior. O termo tem de cair numa coluna
    // depois da primeira, senão o `OR` agrupado e o solto respondem igual e o
    // teste não mede nada.
    await storageRow({
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
