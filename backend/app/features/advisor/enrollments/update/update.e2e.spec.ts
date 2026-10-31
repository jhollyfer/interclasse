import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { Stored } from '#tests/stored-fixtures'
import { drawSport, signInAsAdvisorOfClassroom } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('enrollments > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('the advisor replaces the whole list, including removing an athlete', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const [leaving, entering] = await StudentFactory.merge({
      classroomId: classroom.id,
    }).createMany(2)
    if (!leaving || !entering) throw new Error('factory created fewer students than requested')
    await EnrollmentFactory.merge({ studentId: leaving.id, sportId: sport.id }).create()

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({
        classroomId: classroom.id,
        sportId: sport.id,
        studentIds: [entering.id],
        reason: 'Mudou de turno',
      })

    response.assertStatus(200)
    assert.equal(body(response).classroom.id, classroom.id)
    const enrolled = await Stored.enrollmentsOfSport(sport.id)
    assert.deepEqual(
      enrolled.map((enrollment) => enrollment.studentId),
      [entering.id],
    )
  })

  test('classroom of another advisor responds 404 and nothing changes', async ({
    client,
    assert,
  }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)
    const foreign = await ClassroomFactory.with('advisor').create()
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: foreign.id }).create()

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({ classroomId: foreign.id, sportId: sport.id, studentIds: [student.id] })

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
    assert.lengthOf(await Stored.enrollmentsOfSport(sport.id), 0)
  })

  test('after the draw the advisor can still replace the list', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await drawSport(sport, classroom)

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({ classroomId: classroom.id, sportId: sport.id, studentIds: [student.id] })

    response.assertStatus(200)
    assert.lengthOf(await Stored.enrollmentsOfSport(sport.id), 1)
  })

  test('removing an athlete without a reason responds 422 and nothing changes', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: student.id, sportId: sport.id }).create()

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({ classroomId: classroom.id, sportId: sport.id, studentIds: [] })

    response.assertStatus(422)
    assert.equal(body(response).code, 'ENROLLMENT_REASON_REQUIRED')
    assert.lengthOf(await Stored.enrollmentsOfSport(sport.id), 1)
  })

  test('removing an athlete with a reason becomes a pending notice for the organization', async ({
    client,
    assert,
  }) => {
    const { user, session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: student.id, sportId: sport.id }).create()

    const response = await client.put('/advisor/enrollments').cookies(session).json({
      classroomId: classroom.id,
      sportId: sport.id,
      studentIds: [],
      reason: 'Mau comportamento com os colegas',
    })

    response.assertStatus(200)
    const removals = await Stored.removalsOfClassroom(classroom.id)
    assert.lengthOf(removals, 1)
    assert.equal(removals[0]?.studentName, student.name)
    assert.equal(removals[0]?.reason, 'Mau comportamento com os colegas')
    assert.equal(removals[0]?.actorId, user.id)
    assert.isNull(removals[0]?.acknowledgedAt ?? null)
  })

  test('the removal made by the administrator is born read', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.create()
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: student.id, sportId: sport.id }).create()

    const response = await client.put('/advisor/enrollments').cookies(session).json({
      classroomId: classroom.id,
      sportId: sport.id,
      studentIds: [],
      reason: 'Transferido de escola',
    })

    response.assertStatus(200)
    const removal = await Stored.removalOfClassroomOrFail(classroom.id)
    assert.isNotNull(removal.acknowledgedAt)
  })

  test('above the sport maximum responds 422', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.merge({ maxAthletes: 1 }).create()
    const students = await StudentFactory.merge({ classroomId: classroom.id }).createMany(2)

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({
        classroomId: classroom.id,
        sportId: sport.id,
        studentIds: students.map((student) => student.id),
      })

    response.assertStatus(422)
    assert.equal(body(response).code, 'ENROLLMENT_LIMIT_EXCEEDED')
  })

  test('without a session is 401; representative is 403', async ({ client }) => {
    const anonymous = await client.put('/advisor/enrollments').json({})
    const { session } = await signInWithFactory(client, 'representative')
    const representative = await client.put('/advisor/enrollments').cookies(session).json({})

    anonymous.assertStatus(401)
    representative.assertStatus(403)
  })
})
