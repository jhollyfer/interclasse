import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import Storage from '#models/storage'
import { UploadStatuses } from '#core/entity'
import { UserFactory } from '#database/factories/user.factory'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/helpers'

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
