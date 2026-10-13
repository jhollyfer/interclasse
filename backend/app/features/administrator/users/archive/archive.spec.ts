import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

import Storage from '#models/storage'
import User from '#models/user'
import { UPLOAD_STATUS, USER_ROLE } from '#core/entity'
import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user.factory'
import { authenticate, authenticateAsAdministrator, body, resetDatabase } from '#tests/helpers'

/** Um arquivo já confirmado, que é o único estado que `assertExist` aceita. */
function upload() {
  const id = randomUUID()

  return Storage.create({
    filename: `${id}.png`,
    originalName: 'foto.png',
    mimetype: 'image/png',
    size: 1024,
    path: `${id}.png`,
    status: UPLOAD_STATUS.UPLOADED,
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
  role: USER_ROLE.ADVISOR,
}

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
