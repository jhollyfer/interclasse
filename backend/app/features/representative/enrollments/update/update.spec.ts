import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import Enrollment from '#models/enrollment'
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
} from '#tests/helpers'

test.group('enrollments > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('o representante monta a lista da própria turma, dentro do limite', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.merge({ maxAthletes: 3 }).create()
    const students = await StudentFactory.merge({ classroomId: classroom.id }).createMany(4)
    const ids = students.map((student) => student.id)

    const dentro = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: ids.slice(0, 3) })
    const acima = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: ids })

    dentro.assertStatus(200)
    assert.equal(body(dentro).classroom.id, classroom.id)
    assert.lengthOf(
      body(dentro).students.filter((student: { sportIds: string[] }) =>
        student.sportIds.includes(sport.id),
      ),
      3,
    )
    acima.assertStatus(422)
    assert.equal(body(acima).code, 'ENROLLMENT_LIMIT_EXCEEDED')
    assert.lengthOf(await Enrollment.query().where('sportId', sport.id), 3)
  })

  test('tirar atleta já inscrito é do conselheiro: 403', async ({ client, assert }) => {
    const { session, classroom } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.create()
    const inscrito = await StudentFactory.merge({ classroomId: classroom.id }).create()
    const novo = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: inscrito.id, sportId: sport.id }).create()

    const response = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: [novo.id] })

    response.assertStatus(403)
    assert.equal(body(response).code, 'ENROLLMENT_REMOVAL_FORBIDDEN')
    const enrolled = await Enrollment.query().where('sportId', sport.id)
    assert.deepEqual(
      enrolled.map((enrollment) => enrollment.studentId),
      [inscrito.id],
    )
  })

  test('aluno de outra turma responde 422', async ({ client, assert }) => {
    const { session } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.create()
    const alheio = await StudentFactory.with('classroom').create()

    const response = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: [alheio.id] })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STUDENT_NOT_FOUND')
    assert.lengthOf(await Enrollment.query().where('sportId', sport.id), 0)
  })

  test('modalidade inexistente responde 422', async ({ client, assert }) => {
    const { session } = await signInAsRepresentativeOfClassroom(client)

    const response = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: randomUUID(), studentIds: [] })

    response.assertStatus(422)
    assert.equal(body(response).code, 'SPORT_NOT_FOUND')
  })

  test('depois do sorteio a lista trava: 409', async ({ client, assert }) => {
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
    assert.lengthOf(await Enrollment.query().where('sportId', sport.id), 0)
  })

  test('representante sem turma vinculada responde 404', async ({ client, assert }) => {
    const { session } = await signInWithFactory(client, 'representative')
    const sport = await SportFactory.create()

    const response = await client
      .put('/representative/enrollments')
      .cookies(session)
      .json({ sportId: sport.id, studentIds: [] })

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('aluno repetido na lista responde 422 apontando o campo', async ({ client, assert }) => {
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

  test('sem sessão é 401; conselheiro e administrador recebem 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const admin = await authenticateAsAdministrator(client)
    const payload = { sportId: randomUUID(), studentIds: [] }

    const anonimo = await client.put('/representative/enrollments').json(payload)
    const negados = [
      await client.put('/representative/enrollments').cookies(advisor).json(payload),
      await client.put('/representative/enrollments').cookies(admin).json(payload),
    ]

    anonimo.assertStatus(401)
    for (const response of negados) {
      response.assertStatus(403)
      assert.equal(body(response).code, 'ACCESS_DENIED')
    }
  })
})
