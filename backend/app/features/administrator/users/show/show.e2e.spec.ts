import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { UPLOAD_STATUS } from '@interclasse/shared'

import Storage from '#models/storage'
import { UserFactory } from '#database/factories/user.factory'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

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

test.group('administrator/users/show > acesso e validação', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: sem sessão', async ({ client }) => {
    const response = await client.get('/administrator/users/00000000-0000-4000-8000-000000000000')

    response.assertStatus(401)
  })

  test('403: conselheiro não alcança a rota da organização', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .get('/administrator/users/00000000-0000-4000-8000-000000000000')
      .cookies(advisor)

    response.assertStatus(403)
  })

  test('422: id que não é uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/users/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
  })
})
