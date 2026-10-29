import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { UserFactory } from '#database/factories/user.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('classrooms > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('devolve a turma com conselheiro e representante aninhados', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const advisor = await UserFactory.create()
    const representative = await UserFactory.apply('representative').create()
    const classroom = await ClassroomFactory.merge({
      advisorId: advisor.id,
      representativeId: representative.id,
    }).create()

    const response = await client.get(`/administrator/classrooms/${classroom.id}`).cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).id, classroom.id)
    assert.equal(body(response).name, classroom.name)
    assert.equal(body(response).category, classroom.category)
    assert.equal(body(response).advisor.id, advisor.id)
    assert.equal(body(response).representative.id, representative.id)
    // A conta aninhada sai pelo serializer do model: a senha nunca vai junto.
    assert.notProperty(body(response).advisor, 'password')
  })

  test('turma inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get(`/administrator/classrooms/${randomUUID()}`).cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('identificador que não é uuid responde 422 no campo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/classrooms/nao-e-uuid').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })

  test('sem sessão responde 401, conselheiro responde 403', async ({ client, assert }) => {
    const classroom = await ClassroomFactory.create()

    const anonymous = await client.get(`/administrator/classrooms/${classroom.id}`)
    anonymous.assertStatus(401)

    const advisor = await authenticateAsAdvisor(client)
    const response = await client.get(`/administrator/classrooms/${classroom.id}`).cookies(advisor)

    response.assertStatus(403)
    assert.equal(body(response).code, 'ACCESS_DENIED')
  })
})
