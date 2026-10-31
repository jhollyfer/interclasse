import { test } from '@japa/runner'

import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { drawSport, signInAsRepresentativeOfClassroom } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('enrollments > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('the matrix of the classroom linked to the session', async ({ client, assert }) => {
    const { session, classroom } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: student.id, sportId: sport.id }).create()
    // A student from another classroom does not enter the matrix.
    await StudentFactory.with('classroom').create()

    const response = await client.get('/representative/enrollments').cookies(session)

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

  test('a sport drawn in the classroom category shows as locked', async ({ client, assert }) => {
    const { session, classroom } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.create()
    await drawSport(sport, classroom)

    const response = await client.get('/representative/enrollments').cookies(session)

    response.assertStatus(200)
    assert.isTrue(body(response).sports[0].locked)
  })

  test('representative without a linked classroom responds 404', async ({ client, assert }) => {
    const { session } = await signInWithFactory(client, 'representative')

    const response = await client.get('/representative/enrollments').cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('without a session is 401; advisor and administrator get 403', async ({
    client,
    assert,
  }) => {
    const advisor = await authenticateAsAdvisor(client)
    const admin = await authenticateAsAdministrator(client)

    const anonymous = await client.get('/representative/enrollments')
    const denied = [
      await client.get('/representative/enrollments').cookies(advisor),
      await client.get('/representative/enrollments').cookies(admin),
    ]

    anonymous.assertStatus(401)
    for (const response of denied) {
      response.assertStatus(403)
      assert.equal(body(response).code, 'ACCESS_DENIED')
    }
  })
})
