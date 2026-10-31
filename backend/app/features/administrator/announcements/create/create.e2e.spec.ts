import { test } from '@japa/runner'

import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'
import { Stored } from '#tests/stored-fixtures'

const payload = { title: 'Troca de horário', body: 'O futsal passa para as 14h.' }

test.group('announcements > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('publishes the announcement, not pinned when `pinned` is not sent', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/announcements')
      .cookies(session)
      .json(payload)

    response.assertStatus(201)
    assert.isString(body(response).id)
    assert.equal(body(response).title, payload.title)
    assert.equal(body(response).body, payload.body)
    // The database `DEFAULT`, reread after the insert.
    assert.isFalse(body(response).pinned)
    assert.isString(body(response).createdAt)
    assert.isNotNull(await Stored.announcement(body(response).id))
  })

  test('`pinned: true` publishes the pinned announcement', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/announcements')
      .cookies(session)
      .json({ ...payload, pinned: true })

    response.assertStatus(201)
    assert.isTrue(body(response).pinned)
  })

  test('empty title and body respond 422 pointing at the fields', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/announcements')
      .cookies(session)
      .json({ title: '   ', body: '' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'title')
    assert.property(body(response).errors, 'body')
  })

  test('without a session responds 401 and advisor responds 403', async ({ client, assert }) => {
    const anonymous = await client.post('/administrator/announcements').json(payload)
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client
      .post('/administrator/announcements')
      .cookies(advisor)
      .json(payload)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
    assert.isNull(await Stored.announcementByTitle(payload.title))
  })
})
