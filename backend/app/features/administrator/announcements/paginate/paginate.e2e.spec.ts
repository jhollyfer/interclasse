import { test } from '@japa/runner'

import { AnnouncementFactory } from '#database/factories/announcement.factory'
import { announcementTimeline } from '#tests/announcements-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('announcements > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('sem ?sort: fixados primeiro, depois do mais novo', async ({ client, assert }) => {
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

  test('?sort manda sozinho: o fixado perde a frente', async ({ client, assert }) => {
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

  test('?search recorta pelo título', async ({ client, assert }) => {
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

  test('?sort fora da tupla fechada responde 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    // Na URL, e não em `.qs()`: o registry do Tuyau não deixaria o valor
    // inválido compilar.
    const response = await client.get('/administrator/announcements?sort=body').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'sort')
  })

  test('sem sessão responde 401 e conselheiro responde 403', async ({ client, assert }) => {
    const anonymous = await client.get('/administrator/announcements')
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client.get('/administrator/announcements').cookies(advisor)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
  })
})
