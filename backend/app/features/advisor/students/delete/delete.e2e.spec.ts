import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { Stored } from '#tests/stored-fixtures'
import { drawSport, signInAsAdvisorOfClassroom } from '#tests/classrooms-fixtures'
import { body, resetDatabase, signInWithFactory } from '#tests/http-fixtures'

test.group('students > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('removes the student from the classroom along with their enrollments', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: student.id }).with('sport').create()

    const response = await client.delete(`/advisor/students/${student.id}`).cookies(session)

    response.assertStatus(204)
    assert.isNull(await Stored.student(student.id))
    assert.lengthOf(await Stored.enrollmentsOfStudent(student.id), 0)
  })

  test('student in an already drawn sport responds 409 and stays', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    const sport = await SportFactory.create()
    await EnrollmentFactory.merge({ studentId: student.id, sportId: sport.id }).create()
    await drawSport(sport, classroom)

    const response = await client.delete(`/advisor/students/${student.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'STUDENT_IN_COMPETITION')
    assert.isNotNull(await Stored.student(student.id))
  })

  test('student of another advisor responds 404 and stays', async ({ client, assert }) => {
    const { classroom } = await signInAsAdvisorOfClassroom(client)
    const other = await signInWithFactory(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()

    const response = await client.delete(`/advisor/students/${student.id}`).cookies(other.session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'STUDENT_NOT_FOUND')
    assert.isNotNull(await Stored.student(student.id))
  })

  test('nonexistent student responds the same 404', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)

    const response = await client.delete(`/advisor/students/${randomUUID()}`).cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'STUDENT_NOT_FOUND')
  })

  test('without a session is 401, and the representative gets 403', async ({ client, assert }) => {
    const student = await StudentFactory.with('classroom').create()
    const representative = await signInWithFactory(client, 'representative')

    const anonymous = await client.delete(`/advisor/students/${student.id}`)
    const denied = await client
      .delete(`/advisor/students/${student.id}`)
      .cookies(representative.session)

    anonymous.assertStatus(401)
    denied.assertStatus(403)
    assert.equal(body(denied).code, 'ACCESS_DENIED')
    assert.isNotNull(await Stored.student(student.id))
  })
})

test.group('advisor/students/delete > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('malformed id responds 422 instead of a Postgres 500', async ({ client, assert }) => {
    const { session } = await signInWithFactory(client)

    const response = await client.delete('/advisor/students/x').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'id')
  })
})
