import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'

import { StorageFactory } from '#database/factories/storage.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'
import type { Session } from '#tests/http-fixtures'

const NOT_FOUND_ID = '00000000-0000-4000-8000-000000000000'

test.group('administrator/photos > delete', (group) => {
  group.each.setup(() => resetDatabase())

  /** Uma foto aprovada, enviada pela organização. */
  async function photoBy(client: ApiClient, admin: Session): Promise<string> {
    const image = await StorageFactory.create()
    const created = await client
      .post('/administrator/photos')
      .cookies(admin)
      .json({ storageId: image.id })

    return body(created).id
  }

  test('204: apaga a foto e ela some da lista', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const id = await photoBy(client, admin)

    const response = await client.delete(`/administrator/photos/${id}`).cookies(admin)

    response.assertStatus(204)

    const list = await client.get('/administrator/photos').cookies(admin)
    assert.lengthOf(body(list).data, 0)
  })

  test('401: sem sessão', async ({ client }) => {
    const response = await client.delete(`/administrator/photos/${NOT_FOUND_ID}`)

    response.assertStatus(401)
  })

  test('403: conselheiro não apaga pela rota da organização', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)
    const advisor = await authenticateAsAdvisor(client)
    const id = await photoBy(client, admin)

    const response = await client.delete(`/administrator/photos/${id}`).cookies(advisor)

    response.assertStatus(403)
  })

  test('404: foto inexistente', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete(`/administrator/photos/${NOT_FOUND_ID}`).cookies(admin)

    response.assertStatus(404)
    assert.equal(body(response).code, 'PHOTO_NOT_FOUND')
  })

  test('422: id que não é uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete('/administrator/photos/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
  })
})
