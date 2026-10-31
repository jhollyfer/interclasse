import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { Stored } from '#tests/stored-fixtures'
import { drawSport, signInAsRepresentativeOfClassroom } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('enrollments > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('the representative builds the own classroom list, within the limit', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.merge({ maxAthletes: 3 }).create()
    const students = await StudentFactory.merge({ classroomId: classroom.id }).createMany(4)
    const ids = students.map((student) => student.id)

    const within = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: ids.slice(0, 3) })
    const over = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: ids })

    within.assertStatus(200)
    assert.equal(body(within).classroom.id, classroom.id)
    assert.lengthOf(
      body(within).students.filter((student: { sportIds: string[] }) =>
        student.sportIds.includes(sport.id),
      ),
      3,
    )
    over.assertStatus(422)
    assert.equal(body(over).code, 'ENROLLMENT_LIMIT_EXCEEDED')
    assert.lengthOf(await Stored.enrollmentsOfSport(sport.id), 3)
  })

  test('removing an already enrolled athlete is for the advisor: 403', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.create()
    const enrolledStudent = await StudentFactory.merge({ classroomId: classroom.id }).create()
    const fresh = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: enrolledStudent.id, sportId: sport.id }).create()

    const response = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: [fresh.id] })

    response.assertStatus(403)
    assert.equal(body(response).code, 'ENROLLMENT_REMOVAL_FORBIDDEN')
    const enrolled = await Stored.enrollmentsOfSport(sport.id)
    assert.deepEqual(
      enrolled.map((enrollment) => enrollment.studentId),
      [enrolledStudent.id],
    )
  })

  test('student from another classroom responds 422', async ({ client, assert }) => {
    const { session } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.create()
    const foreign = await StudentFactory.with('classroom').create()

    const response = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: [foreign.id] })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STUDENT_NOT_FOUND')
    assert.lengthOf(await Stored.enrollmentsOfSport(sport.id), 0)
  })

  test('nonexistent sport responds 422', async ({ client, assert }) => {
    const { session } = await signInAsRepresentativeOfClassroom(client)

    const response = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: randomUUID(), studentIds: [] })

    response.assertStatus(422)
    assert.equal(body(response).code, 'SPORT_NOT_FOUND')
  })

  test('after the draw the list locks: 409', async ({ client, assert }) => {
    const { session, classroom } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await drawSport(sport, classroom)

    const response = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: [student.id] })

    response.assertStatus(409)
    assert.equal(body(response).code, 'ENROLLMENT_LOCKED')
    assert.lengthOf(await Stored.enrollmentsOfSport(sport.id), 0)
  })

  test('representative without a linked classroom responds 404', async ({ client, assert }) => {
    const { session } = await signInWithFactory(client, 'representative')
    const sport = await SportFactory.create()

    const response = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: [] })

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('duplicate student in the list responds 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()

    const response = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: [student.id, student.id] })

    response.assertStatus(422)
    assert.property(body(response).errors, 'studentIds')
  })

  test('without a session is 401; advisor and administrator get 403', async ({
    client,
    assert,
  }) => {
    const advisor = await authenticateAsAdvisor(client)
    const admin = await authenticateAsAdministrator(client)
    const payload = { sportId: randomUUID(), studentIds: [] }

    const anonymous = await client.put('/representative/enrollments').json(payload)
    const denied = [
      await client.put('/representative/enrollments').cookies(advisor).json(payload),
      await client.put('/representative/enrollments').cookies(admin).json(payload),
    ]

    anonymous.assertStatus(401)
    for (const response of denied) {
      response.assertStatus(403)
      assert.equal(body(response).code, 'ACCESS_DENIED')
    }
  })
})
