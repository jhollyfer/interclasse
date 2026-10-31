import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { StudentFactory } from '#database/factories/student.factory'
import { signInAsAdvisorOfClassroom } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('students > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('the advisor fixes the name of a student in their own classroom', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()

    const response = await client
      .put(`/advisor/students/${student.id}`)
      .cookies(session)
      .json({ name: '  Maria Clara  ' })

    response.assertStatus(200)
    assert.equal(body(response).id, student.id)
    assert.equal(body(response).name, 'Maria Clara')
    assert.equal(body(response).classroomId, classroom.id)

    await student.refresh()
    assert.equal(student.name, 'Maria Clara')
  })

  test('student of another advisor responds 404 and stays untouched', async ({
    client,
    assert,
  }) => {
    const { classroom } = await signInAsAdvisorOfClassroom(client)
    const other = await signInWithFactory(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id, name: 'Ana' }).create()

    const response = await client
      .put(`/advisor/students/${student.id}`)
      .cookies(other.session)
      .json({ name: 'Outra' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'STUDENT_NOT_FOUND')

    await student.refresh()
    assert.equal(student.name, 'Ana')
  })

  test('nonexistent student responds the same 404', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)

    const response = await client
      .put(`/advisor/students/${randomUUID()}`)
      .cookies(session)
      .json({ name: 'Ninguém' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'STUDENT_NOT_FOUND')
  })

  test('the administrator fixes a student of any classroom', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const student = await StudentFactory.with('classroom').create()

    const response = await client
      .put(`/advisor/students/${student.id}`)
      .cookies(admin)
      .json({ name: 'Corrigido' })

    response.assertStatus(200)
    await student.refresh()
    assert.equal(student.name, 'Corrigido')
  })

  test('empty name responds 422 pointing at the field', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()

    const response = await client
      .put(`/advisor/students/${student.id}`)
      .cookies(session)
      .json({ name: '' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'name')
  })

  test('without a session is 401, and the representative gets 403', async ({ client, assert }) => {
    const student = await StudentFactory.with('classroom').create()
    const representative = await signInWithFactory(client, 'representative')

    const anonymous = await client.put(`/advisor/students/${student.id}`).json({ name: 'X' })
    const denied = await client
      .put(`/advisor/students/${student.id}`)
      .cookies(representative.session)
      .json({ name: 'X' })

    anonymous.assertStatus(401)
    denied.assertStatus(403)
    assert.equal(body(denied).code, 'ACCESS_DENIED')
  })
})
