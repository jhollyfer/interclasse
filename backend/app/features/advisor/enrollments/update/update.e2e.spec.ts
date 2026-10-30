import { test } from '@japa/runner'

import Enrollment from '#models/enrollment'
import EnrollmentRemoval from '#models/enrollment-removal'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { drawSport, signInAsAdvisorOfClassroom } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('enrollments > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('o conselheiro troca a lista inteira, inclusive tirando atleta', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const [saindo, entrando] = await StudentFactory.merge({
      classroomId: classroom.id,
    }).createMany(2)
    if (!saindo || !entrando) throw new Error('factory criou menos alunos que o pedido')
    await EnrollmentFactory.merge({ studentId: saindo.id, sportId: sport.id }).create()

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({
        classroomId: classroom.id,
        sportId: sport.id,
        studentIds: [entrando.id],
        reason: 'Mudou de turno',
      })

    response.assertStatus(200)
    assert.equal(body(response).classroom.id, classroom.id)
    const enrolled = await Enrollment.query().where('sportId', sport.id)
    assert.deepEqual(
      enrolled.map((enrollment) => enrollment.studentId),
      [entrando.id],
    )
  })

  test('turma de outro conselheiro responde 404 e nada muda', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)
    const alheia = await ClassroomFactory.with('advisor').create()
    const sport = await SportFactory.create()
    const aluno = await StudentFactory.merge({ classroomId: alheia.id }).create()

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({ classroomId: alheia.id, sportId: sport.id, studentIds: [aluno.id] })

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
    assert.lengthOf(await Enrollment.query().where('sportId', sport.id), 0)
  })

  test('depois do sorteio o conselheiro ainda troca a lista', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const aluno = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await drawSport(sport, classroom)

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({ classroomId: classroom.id, sportId: sport.id, studentIds: [aluno.id] })

    response.assertStatus(200)
    assert.lengthOf(await Enrollment.query().where('sportId', sport.id), 1)
  })

  test('tirar atleta sem motivo responde 422 e nada muda', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const aluno = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: aluno.id, sportId: sport.id }).create()

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({ classroomId: classroom.id, sportId: sport.id, studentIds: [] })

    response.assertStatus(422)
    assert.equal(body(response).code, 'ENROLLMENT_REASON_REQUIRED')
    assert.lengthOf(await Enrollment.query().where('sportId', sport.id), 1)
  })

  test('tirar atleta com motivo vira aviso pendente para a organização', async ({
    client,
    assert,
  }) => {
    const { user, session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const aluno = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: aluno.id, sportId: sport.id }).create()

    const response = await client.put('/advisor/enrollments').cookies(session).json({
      classroomId: classroom.id,
      sportId: sport.id,
      studentIds: [],
      reason: 'Mau comportamento com os colegas',
    })

    response.assertStatus(200)
    const removals = await EnrollmentRemoval.query().where('classroomId', classroom.id)
    assert.lengthOf(removals, 1)
    assert.equal(removals[0]?.studentName, aluno.name)
    assert.equal(removals[0]?.reason, 'Mau comportamento com os colegas')
    assert.equal(removals[0]?.actorId, user.id)
    assert.isNull(removals[0]?.acknowledgedAt ?? null)
  })

  test('a remoção feita pelo administrador já nasce lida', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.create()
    const sport = await SportFactory.create()
    const aluno = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: aluno.id, sportId: sport.id }).create()

    const response = await client.put('/advisor/enrollments').cookies(session).json({
      classroomId: classroom.id,
      sportId: sport.id,
      studentIds: [],
      reason: 'Transferido de escola',
    })

    response.assertStatus(200)
    const removal = await EnrollmentRemoval.findByOrFail('classroomId', classroom.id)
    assert.isNotNull(removal.acknowledgedAt)
  })

  test('acima do máximo da modalidade responde 422', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.merge({ maxAthletes: 1 }).create()
    const alunos = await StudentFactory.merge({ classroomId: classroom.id }).createMany(2)

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({
        classroomId: classroom.id,
        sportId: sport.id,
        studentIds: alunos.map((aluno) => aluno.id),
      })

    response.assertStatus(422)
    assert.equal(body(response).code, 'ENROLLMENT_LIMIT_EXCEEDED')
  })

  test('sem sessão é 401; representante é 403', async ({ client }) => {
    const anonymous = await client.put('/advisor/enrollments').json({})
    const { session } = await signInWithFactory(client, 'representative')
    const representative = await client.put('/advisor/enrollments').cookies(session).json({})

    anonymous.assertStatus(401)
    representative.assertStatus(403)
  })
})
