import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import Enrollment from '#models/enrollment'
import Student from '#models/student'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { drawSport, signInAsAdvisorOfClassroom } from '#tests/classrooms-fixtures'
import { body, resetDatabase, signInWithFactory } from '#tests/helpers'

test.group('students > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('tira o aluno da turma junto com as inscrições dele', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: student.id }).with('sport').create()

    const response = await client.delete(`/advisor/students/${student.id}`).cookies(session)

    response.assertStatus(204)
    assert.isNull(await Student.find(student.id))
    assert.lengthOf(await Enrollment.query().where('studentId', student.id), 0)
  })

  test('aluno numa modalidade já sorteada responde 409 e fica', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    const sport = await SportFactory.create()
    await EnrollmentFactory.merge({ studentId: student.id, sportId: sport.id }).create()
    await drawSport(sport, classroom)

    const response = await client.delete(`/advisor/students/${student.id}`).cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'STUDENT_IN_COMPETITION')
    assert.isNotNull(await Student.find(student.id))
  })

  test('aluno de outro conselheiro responde 404 e fica', async ({ client, assert }) => {
    const { classroom } = await signInAsAdvisorOfClassroom(client)
    const outro = await signInWithFactory(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()

    const response = await client.delete(`/advisor/students/${student.id}`).cookies(outro.session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'STUDENT_NOT_FOUND')
    assert.isNotNull(await Student.find(student.id))
  })

  test('aluno inexistente responde o mesmo 404', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)

    const response = await client.delete(`/advisor/students/${randomUUID()}`).cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'STUDENT_NOT_FOUND')
  })

  test('sem sessão é 401, e o representante recebe 403', async ({ client, assert }) => {
    const student = await StudentFactory.with('classroom').create()
    const representante = await signInWithFactory(client, 'representative')

    const anonimo = await client.delete(`/advisor/students/${student.id}`)
    const negado = await client
      .delete(`/advisor/students/${student.id}`)
      .cookies(representante.session)

    anonimo.assertStatus(401)
    negado.assertStatus(403)
    assert.equal(body(negado).code, 'ACCESS_DENIED')
    assert.isNotNull(await Student.find(student.id))
  })
})
