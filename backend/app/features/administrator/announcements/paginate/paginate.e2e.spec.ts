import { test } from '@japa/runner'

import { AnnouncementFactory } from '#database/factories/announcement.factory'
import { announcementTimeline } from '#tests/announcements-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('announcements > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('without ?sort: pinned first, then newest', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { pinned, older, newest } = await announcementTimeline()

    const response = await client.get('/administrator/announcements').cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((announcement: { id: string }) => announcement.id),
      [pinned.id, newest.id, older.id],
    )
    assert.equal(body(response).meta.total, 3)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('?sort rules alone: the pinned one loses the front', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await announcementTimeline()

    const response = await client
      .get('/administrator/announcements')
      .qs({ sort: 'title', direction: 'asc' })
      .cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((announcement: { title: string }) => announcement.title),
      ['Fixado antigo', 'Intermediário', 'Recente'],
    )
  })

  test('?search narrows by title', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const match = await AnnouncementFactory.merge({ title: 'Chuva adia a final' }).create()
    await AnnouncementFactory.merge({ title: 'Abertura dos jogos' }).create()

    const response = await client
      .get('/administrator/announcements')
      .qs({ search: 'chuva' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, match.id)
  })

  test('?sort outside the closed tuple responds 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    // In the URL, not in `.qs()`: the Tuyau registry would not let the invalid
    // value compile.
    const response = await client.get('/administrator/announcements?sort=body').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'sort')
  })

  test('without a session responds 401 and advisor responds 403', async ({ client, assert }) => {
    const anonymous = await client.get('/administrator/announcements')
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client.get('/administrator/announcements').cookies(advisor)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
  })
})
