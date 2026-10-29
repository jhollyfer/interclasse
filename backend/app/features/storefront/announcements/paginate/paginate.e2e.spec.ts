import { test } from '@japa/runner'

import { AnnouncementFactory } from '#database/factories/announcement.factory'
import { announcementTimeline } from '#tests/announcements-fixtures'
import { body, resetDatabase } from '#tests/http-fixtures'

test.group('announcements > paginate (site)', (group) => {
  group.each.setup(() => resetDatabase())

  test('responde sem sessão: fixados primeiro, depois do mais novo', async ({ client, assert }) => {
    const { pinned, older, newest } = await announcementTimeline()

    const response = await client.get('/storefront/announcements')

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((announcement: { id: string }) => announcement.id),
      [pinned.id, newest.id, older.id],
    )
    assert.equal(body(response).meta.total, 3)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('cada item traz título, corpo e destaque', async ({ client, assert }) => {
    const announcement = await AnnouncementFactory.create()

    const response = await client.get('/storefront/announcements')

    response.assertStatus(200)
    assert.equal(body(response).data[0].id, announcement.id)
    assert.equal(body(response).data[0].title, announcement.title)
    assert.equal(body(response).data[0].body, announcement.body)
    assert.isFalse(body(response).data[0].pinned)
  })

  test('?search recorta pelo título', async ({ client, assert }) => {
    const match = await AnnouncementFactory.merge({ title: 'Chuva adia a final' }).create()
    await AnnouncementFactory.merge({ title: 'Abertura dos jogos' }).create()

    const response = await client.get('/storefront/announcements').qs({ search: 'chuva' })

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, match.id)
  })

  test('?page sem número válido responde 422', async ({ client, assert }) => {
    const response = await client.get('/storefront/announcements').qs({ page: 0 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'page')
  })
})
