import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

import { UserRoles } from '#core/entity'
import { UserFactory } from '#database/factories/user.factory'
import { ADMINISTRATOR, authenticateAsAdministrator, body, resetDatabase } from '#tests/helpers'

/** Um arquivo já confirmado, que é o único estado que `assertExist` aceita. */

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
