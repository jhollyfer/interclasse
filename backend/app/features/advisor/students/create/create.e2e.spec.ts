import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { Stored } from '#tests/stored-fixtures'
import { signInAsAdvisorOfClassroom } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('students > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('the advisor registers a student in their own classroom', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)

    const response = await client
      .post('/advisor/students')
      .cookies(session)
      .json({ classroomId: classroom.id, name: '  Maria  ' })

    response.assertStatus(201)
    assert.equal(body(response).name, 'Maria')
    assert.equal(body(response).classroomId, classroom.id)
    assert.isString(body(response).id)
    assert.isNotNull(await Stored.student(body(response).id))
  })

  test('classroom of another advisor responds 404, as if it did not exist', async ({
    client,
    assert,
  }) => {
    const { classroom } = await signInAsAdvisorOfClassroom(client)
    const other = await signInWithFactory(client)

    const response = await client
      .post('/advisor/students')
      .cookies(other.session)
      .json({ classroomId: classroom.id, name: 'João' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
    assert.lengthOf(await Stored.studentsOfClassroom(classroom.id), 0)
  })

  test('nonexistent classroom responds the same 404', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)

    const response = await client
      .post('/advisor/students')
      .cookies(session)
      .json({ classroomId: randomUUID(), name: 'João' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('the administrator registers in any classroom', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.create()

    const response = await client
      .post('/advisor/students')
      .cookies(admin)
      .json({ classroomId: classroom.id, name: 'Ana' })

    response.assertStatus(201)
    assert.equal(body(response).classroomId, classroom.id)
  })

  test('empty name responds 422 pointing at the field', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)

    const response = await client
      .post('/advisor/students')
      .cookies(session)
      .json({ classroomId: classroom.id, name: '   ' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'name')
  })

  test('without a session is 401, and the representative gets 403', async ({ client, assert }) => {
    const classroom = await ClassroomFactory.create()
    const representative = await signInWithFactory(client, 'representative')
    const payload = { classroomId: classroom.id, name: 'Caio' }

    const anonymous = await client.post('/advisor/students').json(payload)
    const denied = await client
      .post('/advisor/students')
      .cookies(representative.session)
      .json(payload)

    anonymous.assertStatus(401)
    denied.assertStatus(403)
    assert.equal(body(denied).code, 'ACCESS_DENIED')
  })
})
