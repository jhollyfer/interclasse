import { test } from '@japa/runner'
import { ACTIVE_STATUS, USER_ROLE } from '@interclasse/shared'

import User from '#models/user'
import { UserFactory } from '#database/factories/user.factory'
import { ADMINISTRATOR, authenticateAsAdministrator, body, resetDatabase } from '#tests/helpers'

/** Um arquivo já confirmado, que é o único estado que `assertExist` aceita. */

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
      .json({ role: USER_ROLE.ADVISOR })

    response.assertStatus(403)
    assert.equal(body(response).code, 'SELF_ACCESS_FORBIDDEN')

    await eu.refresh()
    assert.equal(eu.role, USER_ROLE.ADMINISTRATOR)
  })

  test('desativar a própria conta responde 403 e não escreve', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const eu = await User.findByOrFail('email', ADMINISTRATOR.email)

    const response = await client
      .put(`/administrator/users/${eu.id}`)
      .cookies(session)
      .json({ status: ACTIVE_STATUS.INACTIVE })

    response.assertStatus(403)
    assert.equal(body(response).code, 'SELF_ACCESS_FORBIDDEN')

    await eu.refresh()
    assert.equal(eu.status, ACTIVE_STATUS.ACTIVE)
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
    const outro = await UserFactory.merge({ role: USER_ROLE.ADMINISTRATOR }).create()

    const response = await client.patch(`/administrator/users/${outro.id}/archive`).cookies(session)

    response.assertStatus(204)

    await outro.refresh()
    assert.isNotNull(outro.deletedAt)
  })
})
