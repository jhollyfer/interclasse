import { test } from '@japa/runner'

import Enrollment from '#models/enrollment'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { drawSport, signInAsAdvisorOfClassroom } from '#tests/classrooms-fixtures'
import { body, resetDatabase, signInWithFactory } from '#tests/helpers'

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
      .json({ classroomId: classroom.id, sportId: sport.id, studentIds: [entrando.id] })

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

  test('modalidade já sorteada na categoria responde 409', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const aluno = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await drawSport(sport, classroom)

    const response = await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({ classroomId: classroom.id, sportId: sport.id, studentIds: [aluno.id] })

    response.assertStatus(409)
    assert.equal(body(response).code, 'ENROLLMENT_LOCKED')
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
