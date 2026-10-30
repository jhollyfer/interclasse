import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import Announcement from '#models/announcement'
import { AnnouncementFactory } from '#database/factories/announcement.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('announcements > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('apaga de vez e responde 204 sem corpo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const announcement = await AnnouncementFactory.apply('pinned').create()

    const response = await client
      .delete(`/administrator/announcements/${announcement.id}`)
      .cookies(session)

    response.assertStatus(204)
    assert.isEmpty(response.text())
    assert.isNull(await Announcement.find(announcement.id))
  })

  test('aviso inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .delete(`/administrator/announcements/${randomUUID()}`)
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'ANNOUNCEMENT_NOT_FOUND')
  })

  test('sem sessão responde 401 e conselheiro responde 403', async ({ client, assert }) => {
    const announcement = await AnnouncementFactory.create()

    const anonymous = await client.delete(`/administrator/announcements/${announcement.id}`)
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client
      .delete(`/administrator/announcements/${announcement.id}`)
      .cookies(advisor)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
    assert.isNotNull(await Announcement.find(announcement.id))
  })
})

test.group('administrator/announcements/delete > acesso e validação', (group) => {
  group.each.setup(() => resetDatabase())

  test('422: id que não é uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete('/administrator/announcements/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
  })
})
