import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Storage from '#models/storage'
import User from '#models/user'
import { ActiveStatuses, UploadStatuses, UserRoles } from '#core/entity'
import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user_factory'
import {
  ADMINISTRATOR,
  authenticate,
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '../helpers.ts'

/** Um arquivo já confirmado, que é o único estado que `assertExist` aceita. */
function upload() {
  const id = randomUUID()

  return Storage.create({
    filename: `${id}.png`,
    originalName: 'foto.png',
    mimetype: 'image/png',
    size: 1024,
    path: `${id}.png`,
    status: UploadStatuses.UPLOADED,
  })
}

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
  role: UserRoles.ADVISOR,
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
      .qs({ role: UserRoles.ADVISOR })
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
      .qs({ status: ActiveStatuses.INACTIVE })
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

test.group('administrador > users > leitura', (group) => {
  group.each.setup(() => resetDatabase())

  test('a foto sai aninhada e a senha não sai', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const avatar = await upload()

    const user = await UserFactory.merge({ avatarId: avatar.id }).create()

    const response = await client.get(`/administrator/users/${user.id}`).cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).avatar.id, avatar.id)
    assert.notProperty(body(response), 'password')
  })

  test('usuário arquivado responde 404', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const response = await client.get(`/administrator/users/${user.id}`).cookies(session)

    response.assertStatus(404)
  })
})

test.group('administrador > users > criação', (group) => {
  group.each.setup(() => resetDatabase())

  test('a conta nasce ACTIVE e sem senha na resposta', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.post('/administrator/users').cookies(session).json(payload)

    response.assertStatus(201)
    assert.equal(body(response).role, UserRoles.ADVISOR)
    // A coluna tem `DEFAULT 'ACTIVE'` e o payload não escreve a chave ausente.
    assert.equal(body(response).status, ActiveStatuses.ACTIVE)
    assert.notProperty(body(response), 'password')
  })

  test('a senha é gravada cifrada e serve para entrar', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const criado = await client.post('/administrator/users').cookies(session).json(payload)
    criado.assertStatus(201)

    // O mixin `withAuthFinder` cifra no save: gravar o texto puro deixaria a
    // senha legível no banco, e um hash de hash não deixaria ninguém entrar.
    const user = await User.findOrFail(body(criado).id)
    assert.notEqual(user.password, payload.password)

    const entrada = await client
      .post('/authentication/sign-in')
      .json({ email: payload.email, password: payload.password })

    entrada.assertStatus(204)
  })

  test('e-mail de conta viva responde 409 apontando o campo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/users')
      .cookies(session)
      .json({ ...payload, email: ADMINISTRATOR.email })

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_ALREADY_EXISTS')
    assert.property(body(response).errors, 'email')
  })

  test('e-mail de conta arquivada reativa a linha em vez de estourar o unique', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const arquivado = await UserFactory.merge({
      email: payload.email,
      deletedAt: DateTime.now(),
    }).create()

    const response = await client.post('/administrator/users').cookies(session).json(payload)

    response.assertStatus(201)
    // Mesma linha: `email` é `UNIQUE` global e a remoção é lógica, então
    // inserir de novo esbarraria no índice e viraria 500.
    assert.equal(body(response).id, arquivado.id)
    assert.isNull(body(response).deletedAt)

    const [{ count }] = await db.from('users').where('email', payload.email).count('* as count')
    assert.equal(Number(count), 1)
  })

  test('senha fraca responde 422 apontando o campo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/users')
      .cookies(session)
      .json({ ...payload, password: 'demo', passwordConfirmation: 'demo' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'password')
  })

  test('role ausente responde 422: o papel é sempre explícito', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const { role: _semPapel, ...semRole } = payload

    const response = await client.post('/administrator/users').cookies(session).json(semRole)

    response.assertStatus(422)
    // `backend-old` caía em ADMINISTRATOR por omissão, e um caminho de criação
    // esquecido gravava o papel mais poderoso em silêncio.
    assert.property(body(response).errors, 'role')
  })

  test('foto inexistente responde 422 apontando o campo e antes de gravar', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/users')
      .cookies(session)
      .json({ ...payload, avatarId: randomUUID() })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
    assert.property(body(response).errors, 'avatarId')

    const [{ count }] = await db.from('users').where('email', payload.email).count('* as count')
    assert.equal(Number(count), 0)
  })
})

test.group('administrador > users > atualização', (group) => {
  group.each.setup(() => resetDatabase())

  test('payload parcial não apaga o campo ausente', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.merge({ name: 'Original' }).create()

    const response = await client
      .put(`/administrator/users/${user.id}`)
      .cookies(session)
      .json({ name: 'Editado' })

    response.assertStatus(200)
    assert.equal(body(response).name, 'Editado')
    assert.equal(body(response).email, user.email)
    assert.equal(body(response).role, UserRoles.ADVISOR)
    assert.notProperty(body(response), 'password')
  })

  test('promover troca o papel', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const response = await client
      .put(`/administrator/users/${user.id}`)
      .cookies(session)
      .json({ role: UserRoles.ADMINISTRATOR })

    response.assertStatus(200)
    assert.equal(body(response).role, UserRoles.ADMINISTRATOR)
  })

  test('e-mail de outra conta responde 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const response = await client
      .put(`/administrator/users/${user.id}`)
      .cookies(session)
      .json({ email: ADMINISTRATOR.email })

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_ALREADY_EXISTS')
  })

  test('trocar a senha derruba as sessões da conta alterada', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    // Uma sessão viva do alvo, criada antes da troca.
    const antes = await client
      .post('/authentication/sign-in')
      .json({ email: user.email, password: 'Demo1234!' })
    antes.assertStatus(204)

    const response = await client
      .put(`/administrator/users/${user.id}`)
      .cookies(session)
      .json({ password: 'Outra1234!', passwordConfirmation: 'Outra1234!' })

    response.assertStatus(200)
    // Sem a revogação, desligar o acesso de alguém não desligaria nada: o token
    // anterior à troca continuaria valendo até vencer.
    const [{ count }] = await db
      .from('auth_access_tokens')
      .where('tokenable_id', user.id)
      .count('* as count')
    assert.equal(Number(count), 0)
  })

  test('usuário arquivado não é editável', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const response = await client
      .put(`/administrator/users/${user.id}`)
      .cookies(session)
      .json({ name: 'Editado' })

    response.assertStatus(404)
  })
})

/**
 * O ciclo de vida da conta. Três operações e três estados, como nos recursos de
 * conteúdo - com uma diferença: arquivar aqui também revoga as sessões, porque
 * o guard não conhece `deleted_at` e sem isso arquivar não desligaria ninguém.
 */
test.group('administrador > users > ciclo de vida', (group) => {
  group.each.setup(() => resetDatabase())

  test('arquivar duas vezes responde 404 na segunda', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const primeira = await client.patch(`/administrator/users/${user.id}/archive`).cookies(session)
    primeira.assertStatus(204)

    const segunda = await client.patch(`/administrator/users/${user.id}/archive`).cookies(session)
    segunda.assertStatus(404)
  })

  test('arquivar revoga as sessões da conta', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const alvo = await authenticate(client, user.email, FACTORY_PASSWORD)

    const arquivar = await client.patch(`/administrator/users/${user.id}/archive`).cookies(session)
    arquivar.assertStatus(204)

    const [{ count }] = await db
      .from('auth_access_tokens')
      .where('tokenable_id', user.id)
      .count('* as count')
    assert.equal(Number(count), 0)

    // Sem sessão, e não sem permissão: o token deixou de existir, então quem
    // chega não é ninguém - 401, nunca 403.
    const depois = await client.get('/account').cookies(alvo)
    depois.assertStatus(401)
  })

  test('restaurar usuário vivo responde 404', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const response = await client
      .patch(`/administrator/users/${user.id}/unarchive`)
      .cookies(session)

    response.assertStatus(404)
  })

  test('apagar sem arquivar responde 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const response = await client.delete(`/administrator/users/${user.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_NOT_ARCHIVED')
  })

  test('apagar usuário arquivado responde 204 e leva os tokens junto', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const avatar = await upload()
    const user = await UserFactory.merge({ avatarId: avatar.id }).create()

    // Um token vivo antes de arquivar, para provar o `CASCADE` do purge.
    await authenticate(client, user.email, FACTORY_PASSWORD)
    await User.accessTokens.create(user)

    const arquivar = await client.patch(`/administrator/users/${user.id}/archive`).cookies(session)
    arquivar.assertStatus(204)

    const response = await client.delete(`/administrator/users/${user.id}`).cookies(session)

    response.assertStatus(204)
    assert.isNull(await User.find(user.id))

    const [{ count }] = await db
      .from('auth_access_tokens')
      .where('tokenable_id', user.id)
      .count('* as count')
    assert.equal(Number(count), 0)
    // O arquivo fica: a chave é `SET NULL` e o binário é neutro.
    assert.isNotNull(await Storage.find(avatar.id))
  })

  test('o percurso completo fecha: criar, arquivar, restaurar, arquivar e apagar', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const criado = await client.post('/administrator/users').cookies(session).json(payload)
    criado.assertStatus(201)

    const id = body(criado).id

    const arquivado = await client.patch(`/administrator/users/${id}/archive`).cookies(session)
    arquivado.assertStatus(204)

    // Fora das listagens padrão, dentro de `?trashed=only`.
    const lixeira = await client
      .get('/administrator/users')
      .qs({ trashed: 'only' })
      .cookies(session)

    lixeira.assertStatus(200)
    assert.lengthOf(body(lixeira).data, 1)

    const restaurado = await client.patch(`/administrator/users/${id}/unarchive`).cookies(session)
    restaurado.assertStatus(204)

    const ver = await client.get(`/administrator/users/${id}`).cookies(session)
    ver.assertStatus(200)

    const denovo = await client.patch(`/administrator/users/${id}/archive`).cookies(session)
    denovo.assertStatus(204)

    const apagado = await client.delete(`/administrator/users/${id}`).cookies(session)
    apagado.assertStatus(204)

    assert.isNull(await User.find(id))
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

/**
 * A guarda de auto-trancamento. Todo caminho que tiraria do painel quem está
 * administrando responde `403`, e nenhum deles chega a escrever - é o que
 * mantém sempre um administrador vivo sem precisar contar administradores.
 */
test.group('administrador > users > o administrador não se tranca', (group) => {
  group.each.setup(() => resetDatabase())

  test('arquivar a própria conta responde 403 e não escreve', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const eu = await User.findByOrFail('email', ADMINISTRATOR.email)

    const response = await client.patch(`/administrator/users/${eu.id}/archive`).cookies(session)

    response.assertStatus(403)
    assert.equal(body(response).code, 'SELF_ARCHIVE_FORBIDDEN')

    await eu.refresh()
    assert.isNull(eu.deletedAt)
  })

  test('apagar a própria conta responde 403, e não o 409 de não arquivada', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const eu = await User.findByOrFail('email', ADMINISTRATOR.email)

    const response = await client.delete(`/administrator/users/${eu.id}`).cookies(session)

    response.assertStatus(403)
    assert.equal(body(response).code, 'SELF_DELETE_FORBIDDEN')
    assert.isNotNull(await User.find(eu.id))
  })

  test('rebaixar o próprio papel responde 403 e não escreve', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const eu = await User.findByOrFail('email', ADMINISTRATOR.email)

    const response = await client
      .put(`/administrator/users/${eu.id}`)
      .cookies(session)
      .json({ role: UserRoles.ADVISOR })

    response.assertStatus(403)
    assert.equal(body(response).code, 'SELF_ACCESS_FORBIDDEN')

    await eu.refresh()
    assert.equal(eu.role, UserRoles.ADMINISTRATOR)
  })

  test('desativar a própria conta responde 403 e não escreve', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const eu = await User.findByOrFail('email', ADMINISTRATOR.email)

    const response = await client
      .put(`/administrator/users/${eu.id}`)
      .cookies(session)
      .json({ status: ActiveStatuses.INACTIVE })

    response.assertStatus(403)
    assert.equal(body(response).code, 'SELF_ACCESS_FORBIDDEN')

    await eu.refresh()
    assert.equal(eu.status, ActiveStatuses.ACTIVE)
  })

  test('a guarda é só sobre papel e status: o próprio nome segue editável', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const eu = await User.findByOrFail('email', ADMINISTRATOR.email)

    const response = await client
      .put(`/administrator/users/${eu.id}`)
      .cookies(session)
      .json({ name: 'Editado' })

    response.assertStatus(200)
    assert.equal(body(response).name, 'Editado')
  })

  test('a guarda é sobre quem pede, não sobre o papel: outro administrador é arquivável', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const outro = await UserFactory.merge({ role: UserRoles.ADMINISTRATOR }).create()

    const response = await client.patch(`/administrator/users/${outro.id}/archive`).cookies(session)

    response.assertStatus(204)

    await outro.refresh()
    assert.isNotNull(outro.deletedAt)
  })
})
