import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { AnnouncementFactory } from '#database/factories/announcement.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('announcements > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('devolve o aviso inteiro', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const announcement = await AnnouncementFactory.apply('pinned').create()

    const response = await client
      .get(`/administrator/announcements/${announcement.id}`)
      .cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).id, announcement.id)
    assert.equal(body(response).title, announcement.title)
    assert.equal(body(response).body, announcement.body)
    assert.isTrue(body(response).pinned)
  })

  test('aviso inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .get(`/administrator/announcements/${randomUUID()}`)
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'ANNOUNCEMENT_NOT_FOUND')
  })

  test('id que não é uuid responde 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/announcements/123').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })

  test('sem sessão responde 401 e conselheiro responde 403', async ({ client, assert }) => {
    const announcement = await AnnouncementFactory.create()

    const anonymous = await client.get(`/administrator/announcements/${announcement.id}`)
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client
      .get(`/administrator/announcements/${announcement.id}`)
      .cookies(advisor)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
  })
})
