import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import Storage from '#models/storage'
import User from '#models/user'
import { USER_ROLE } from '#core/entity'
import { StorageFactory } from '#database/factories/storage.factory'
import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user.factory'
import {
  ADMINISTRATOR,
  authenticate,
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

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

test.group('users > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('apagar sem arquivar responde 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await UserFactory.create()

    const response = await client.delete(`/administrator/users/${user.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_NOT_ARCHIVED')
    assert.isNotNull(await User.find(user.id))
  })

  test('apagar usuário arquivado responde 204 e leva os tokens junto', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const avatar = await StorageFactory.create()
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

  test('usuário inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.delete(`/administrator/users/${randomUUID()}`).cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'USER_NOT_FOUND')
  })

  test('a própria conta responde 403 antes da exigência de arquivamento', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const self = await User.findByOrFail('email', ADMINISTRATOR.email)

    const response = await client.delete(`/administrator/users/${self.id}`).cookies(session)

    // 403 e não 409: a regra que protege é a da própria conta, não o estado do registro.
    response.assertStatus(403)
    assert.equal(body(response).code, 'SELF_DELETE_FORBIDDEN')
    assert.isNotNull(await User.find(self.id))
  })

  test('sem sessão responde 401, conselheiro responde 403', async ({ client, assert }) => {
    const user = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const anonymous = await client.delete(`/administrator/users/${user.id}`)
    anonymous.assertStatus(401)

    const advisor = await authenticateAsAdvisor(client)
    const response = await client.delete(`/administrator/users/${user.id}`).cookies(advisor)

    response.assertStatus(403)
    assert.equal(body(response).code, 'ACCESS_DENIED')
    assert.isNotNull(await User.find(user.id))
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
