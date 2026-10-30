import { test } from '@japa/runner'

import Announcement from '#models/announcement'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

const payload = { title: 'Troca de horário', body: 'O futsal passa para as 14h.' }

test.group('announcements > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('publica o aviso, sem destaque quando `pinned` não vem', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/announcements')
      .cookies(session)
      .json(payload)

    response.assertStatus(201)
    assert.isString(body(response).id)
    assert.equal(body(response).title, payload.title)
    assert.equal(body(response).body, payload.body)
    // O `DEFAULT` do banco, relido depois do insert.
    assert.isFalse(body(response).pinned)
    assert.isString(body(response).createdAt)
    assert.isNotNull(await Announcement.find(body(response).id))
  })

  test('`pinned: true` publica o aviso fixado', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/announcements')
      .cookies(session)
      .json({ ...payload, pinned: true })

    response.assertStatus(201)
    assert.isTrue(body(response).pinned)
  })

  test('título e corpo vazios respondem 422 apontando os campos', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/announcements')
      .cookies(session)
      .json({ title: '   ', body: '' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'title')
    assert.property(body(response).errors, 'body')
  })

  test('sem sessão responde 401 e conselheiro responde 403', async ({ client, assert }) => {
    const anonymous = await client.post('/administrator/announcements').json(payload)
    const advisor = await authenticateAsAdvisor(client)
    const forbidden = await client
      .post('/administrator/announcements')
      .cookies(advisor)
      .json(payload)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
    assert.equal(body(forbidden).code, 'ACCESS_DENIED')
    assert.isNull(await Announcement.findBy('title', payload.title))
  })
})
