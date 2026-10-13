import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { ACTIVE_STATUS, USER_ROLE } from '#core/entity'
import { UserFactory } from '#database/factories/user.factory'
import {
  ADMINISTRATOR,
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

/** Um arquivo já confirmado, que é o único estado que `assertExist` aceita. */

/**
 * O payload de criação. `passwordConfirmation` acompanha a senha porque a regra
 * de força compartilhada exige `confirmed` - o campo é lido do input cru e não
 * chega ao banco.
 */
const payload = {
  name: 'Nova Pessoa',
  email: 'nova.pessoa@mail.com',
  password: 'Demo1234!',
  passwordConfirmation: 'Demo1234!',
  role: USER_ROLE.ADVISOR,
}

test.group('administrador > users > listagem', (group) => {
  group.each.setup(() => resetDatabase())

  test('sem ?trashed a listagem esconde os arquivados', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    await UserFactory.merge({ name: 'Arquivado', deletedAt: DateTime.now() }).create()

    const response = await client.get('/administrator/users').cookies(session)

    response.assertStatus(200)
    // Só o administrador do seeder: o arquivado fica de fora.
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].email, ADMINISTRATOR.email)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('?role recorta a lista pelo papel', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const editor = await UserFactory.create()

    const response = await client
      .get('/administrator/users')
      .qs({ role: USER_ROLE.ADVISOR })
      .cookies(session)

    response.assertStatus(200)
    // O administrador do seeder não entra no recorte.
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, editor.id)
  })

  test('?status recorta a lista pelo acesso', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const inativo = await UserFactory.apply('inactive').create()

    const response = await client
      .get('/administrator/users')
      .qs({ status: ACTIVE_STATUS.INACTIVE })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, inativo.id)
  })

  test('a senha não sai na listagem', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    await UserFactory.create()

    const response = await client.get('/administrator/users').cookies(session)

    response.assertStatus(200)
    for (const user of body(response).data) assert.notProperty(user, 'password')
  })

  test('?sort fora da tupla fechada responde 422 apontando o campo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    // `password` é coluna de `users`, mas não é coluna de ordenação: o valor
    // iria direto para o `orderBy` e comporia SQL.
    //
    // A query vai na própria URL, e não em `.qs()`: o registry do Tuyau tipa o
    // objeto pela tupla fechada, e o valor inválido que este teste existe para
    // mandar não compilaria.
    const response = await client.get('/administrator/users?sort=password').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'sort')
  })

  test('?search não escapa do filtro de lixeira', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const vivo = await UserFactory.merge({ name: 'Joana Ribeiro' }).create()
    // Casa a busca pelo **e-mail**, e não pelo nome, e está arquivada: com o
    // `OR` solto ela apareceria na listagem padrão, porque o `OR` anula o `AND`
    // anterior. O termo tem de cair na segunda coluna da busca; na primeira, o
    // `OR` solto daria a mesma resposta do agrupado.
    await UserFactory.merge({
      name: 'Arquivada sem o termo no nome',
      email: 'joana.arquivada@mail.com',
      deletedAt: DateTime.now(),
    }).create()

    const response = await client
      .get('/administrator/users')
      .qs({ search: 'joana' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, vivo.id)
  })
})

/**
 * O módulo inteiro é do administrador, e não só o `DELETE` como nos recursos de
 * conteúdo: quem edita conteúdo não alcança quem entra no painel - inclusive a
 * leitura, que expõe o e-mail de todo mundo.
 *
 * Um caso por rota do grupo, e não um só: o middleware está no subgrupo, e uma
 * rota nova que nascer fora dele não seria pega por uma asserção única.
 */
test.group('administrador > users > o conselheiro não alcança o módulo', (group) => {
  group.each.setup(() => resetDatabase())

  test('conselheiro recebe 403 em toda rota de usuários', async ({ client, assert }) => {
    const session = await authenticateAsAdvisor(client)
    const alvo = await UserFactory.create()

    const respostas = [
      await client.get('/administrator/users').cookies(session),
      await client.post('/administrator/users').cookies(session).json(payload),
      await client.get(`/administrator/users/${alvo.id}`).cookies(session),
      await client.put(`/administrator/users/${alvo.id}`).cookies(session).json({ name: 'X' }),
      await client.patch(`/administrator/users/${alvo.id}/archive`).cookies(session),
      await client.patch(`/administrator/users/${alvo.id}/unarchive`).cookies(session),
      await client.delete(`/administrator/users/${alvo.id}`).cookies(session),
    ]

    for (const response of respostas) {
      response.assertStatus(403)
      assert.equal(body(response).code, 'ACCESS_DENIED')
    }
  })
})
