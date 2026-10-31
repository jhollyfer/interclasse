import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import {
  drawSport,
  signInAsAdvisorOfClassroom,
  classroomWithStudents,
} from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('enrollments > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('the own classroom matrix: students, sports and who plays what', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: student.id, sportId: sport.id }).create()
    // A student from another classroom does not enter the matrix.
    await StudentFactory.with('classroom').create()

    const response = await client
      .get('/advisor/enrollments')
      .qs({ classroomId: classroom.id })
      .cookies(session)

    response.assertStatus(200)
    assert.deepEqual(body(response).classroom, {
      id: classroom.id,
      name: classroom.name,
      category: classroom.category,
    })
    assert.deepEqual(body(response).sports, [
      {
        id: sport.id,
        name: sport.name,
        minAthletes: sport.minAthletes,
        maxAthletes: sport.maxAthletes,
        drawn: false,
        locked: false,
      },
    ])
    assert.deepEqual(body(response).students, [
      { id: student.id, name: student.name, sportIds: [sport.id] },
    ])
  })

  test('a drawn sport shows as drawn, but not locked for the advisor', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const drawn = await SportFactory.create()
    const undrawn = await SportFactory.create()
    await drawSport(drawn, classroom)

    const response = await client
      .get('/advisor/enrollments')
      .qs({ classroomId: classroom.id })
      .cookies(session)

    response.assertStatus(200)
    const state = Object.fromEntries(
      body(response).sports.map((sport: { id: string; drawn: boolean; locked: boolean }) => [
        sport.id,
        { drawn: sport.drawn, locked: sport.locked },
      ]),
    )
    assert.deepEqual(state, {
      [drawn.id]: { drawn: true, locked: false },
      [undrawn.id]: { drawn: false, locked: false },
    })
  })

  test('classroom of another advisor or nonexistent responds 404', async ({ client, assert }) => {
    const { classroom } = await signInAsAdvisorOfClassroom(client)
    const other = await signInWithFactory(client)

    const foreign = await client
      .get('/advisor/enrollments')
      .qs({ classroomId: classroom.id })
      .cookies(other.session)
    const missing = await client
      .get('/advisor/enrollments')
      .qs({ classroomId: randomUUID() })
      .cookies(other.session)

    for (const response of [foreign, missing]) {
      response.assertStatus(404)
      assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
    }
  })

  test('the administrator opens the matrix of any classroom', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const classroom = await classroomWithStudents(2)

    const response = await client
      .get('/advisor/enrollments')
      .qs({ classroomId: classroom.id })
      .cookies(admin)

    response.assertStatus(200)
    assert.lengthOf(body(response).students, 2)
  })

  test('without ?classroomId responds 422 pointing at the field', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)

    const response = await client.get('/advisor/enrollments').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'classroomId')
  })

  test('without a session is 401, and the representative gets 403', async ({ client, assert }) => {
    const classroom = await ClassroomFactory.create()
    const representative = await signInWithFactory(client, 'representative')

    const anonymous = await client.get('/advisor/enrollments').qs({ classroomId: classroom.id })
    const denied = await client
      .get('/advisor/enrollments')
      .qs({ classroomId: classroom.id })
      .cookies(representative.session)

    anonymous.assertStatus(401)
    denied.assertStatus(403)
    assert.equal(body(denied).code, 'ACCESS_DENIED')
  })
})
