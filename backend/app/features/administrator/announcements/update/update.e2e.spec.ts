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

test.group('announcements > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('payload parcial não apaga o campo ausente', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const announcement = await AnnouncementFactory.create()

    const response = await client
      .put(`/administrator/announcements/${announcement.id}`)
      .cookies(session)
      .json({ title: 'Novo título' })

    response.assertStatus(200)
    assert.equal(body(response).id, announcement.id)
    assert.equal(body(response).title, 'Novo título')
    assert.equal(body(response).body, announcement.body)
    assert.isFalse(body(response).pinned)
  })

  test('fixar e desafixar troca só o destaque', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const announcement = await AnnouncementFactory.create()

    const pinned = await client
      .put(`/administrator/announcements/${announcement.id}`)
      .cookies(session)
      .json({ pinned: true })
    const unpinned = await client
      .put(`/administrator/announcements/${announcement.id}`)
      .cookies(session)
      .json({ pinned: false })

    pinned.assertStatus(200)
    assert.isTrue(body(pinned).pinned)
    unpinned.assertStatus(200)
    assert.isFalse(body(unpinned).pinned)
    assert.equal(body(unpinned).title, announcement.title)
  })

  test('aviso inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put(`/administrator/announcements/${randomUUID()}`)
      .cookies(session)
      .json({ title: 'Qualquer' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'ANNOUNCEMENT_NOT_FOUND')
  })

  test('título acima de 160 caracteres responde 422 e não grava', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const announcement = await AnnouncementFactory.create()

    const response = await client
      .put(`/administrator/announcements/${announcement.id}`)
      .cookies(session)
      .json({ title: 'a'.repeat(161) })

    response.assertStatus(422)
    assert.property(body(response).errors, 'title')
    const stored = await Announcement.findOrFail(announcement.id)
    assert.equal(stored.title, announcement.title)
  })

  test('título vazio, só de espaços ou nulo responde 422 e não grava', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const announcement = await AnnouncementFactory.create()

    // O bodyparser apara e converte `''` em `null`; sem `notNull()`, o
    // `optional()` tirava o `null` do payload e a resposta era 200 com o
    // título antigo.
    for (const title of ['', '   ', null]) {
      const response = await client
        .put(`/administrator/announcements/${announcement.id}`)
        .cookies(session)
        .json({ title })

      response.assertStatus(422)
      assert.property(body(response).errors, 'title')
    }
    const stored = await Announcement.findOrFail(announcement.id)
    assert.equal(stored.title, announcement.title)
  })

  test('sem sessão responde 401 e conselheiro responde 403', async ({ client, assert }) => {
    const announcement = await AnnouncementFactory.create()

    const anonymous = await client
      .put(`/administrator/announcements/${announcement.id}`)
      .json({ title: 'X' })
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client
      .put(`/administrator/announcements/${announcement.id}`)
      .cookies(advisor)
      .json({ title: 'X' })

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
  })
})
