import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { Stored } from '#tests/stored-fixtures'
import { AnnouncementFactory } from '#database/factories/announcement.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('announcements > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('partial payload does not erase the missing field', async ({ client, assert }) => {
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

  test('pinning and unpinning changes only the highlight', async ({ client, assert }) => {
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

  test('nonexistent announcement responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put(`/administrator/announcements/${randomUUID()}`)
      .cookies(session)
      .json({ title: 'Qualquer' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'ANNOUNCEMENT_NOT_FOUND')
  })

  test('title above 160 characters responds 422 and does not save', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const announcement = await AnnouncementFactory.create()

    const response = await client
      .put(`/administrator/announcements/${announcement.id}`)
      .cookies(session)
      .json({ title: 'a'.repeat(161) })

    response.assertStatus(422)
    assert.property(body(response).errors, 'title')
    const stored = await Stored.announcementOrFail(announcement.id)
    assert.equal(stored.title, announcement.title)
  })

  test('empty, whitespace-only or null title responds 422 and does not save', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const announcement = await AnnouncementFactory.create()

    // The bodyparser trims and converts `''` into `null`; without `notNull()`, the
    // `optional()` removed the `null` from the payload and the response was 200 with the
    // old title.
    for (const title of ['', '   ', null]) {
      const response = await client
        .put(`/administrator/announcements/${announcement.id}`)
        .cookies(session)
        .json({ title })

      response.assertStatus(422)
      assert.property(body(response).errors, 'title')
    }
    const stored = await Stored.announcementOrFail(announcement.id)
    assert.equal(stored.title, announcement.title)
  })

  test('without a session responds 401 and advisor responds 403', async ({ client, assert }) => {
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
