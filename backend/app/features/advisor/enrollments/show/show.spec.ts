import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { drawSport, signInAsAdvisorOfClassroom } from '#tests/classrooms-fixtures'
import { authenticateAsAdministrator, body, resetDatabase, signInWithFactory } from '#tests/helpers'

test.group('enrollments > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('a matriz da própria turma: alunos, modalidades e quem joga o quê', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: student.id, sportId: sport.id }).create()
    // Aluno de outra turma não entra na matriz.
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

  test('modalidade sorteada aparece sorteada, mas não travada para o conselheiro', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const sorteada = await SportFactory.create()
    const aberta = await SportFactory.create()
    await drawSport(sorteada, classroom)

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
      [sorteada.id]: { drawn: true, locked: false },
      [aberta.id]: { drawn: false, locked: false },
    })
  })

  test('turma de outro conselheiro ou inexistente responde 404', async ({ client, assert }) => {
    const { classroom } = await signInAsAdvisorOfClassroom(client)
    const outro = await signInWithFactory(client)

    const alheia = await client
      .get('/advisor/enrollments')
      .qs({ classroomId: classroom.id })
      .cookies(outro.session)
    const ausente = await client
      .get('/advisor/enrollments')
      .qs({ classroomId: randomUUID() })
      .cookies(outro.session)

    for (const response of [alheia, ausente]) {
      response.assertStatus(404)
      assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
    }
  })

  test('o administrador abre a matriz de qualquer turma', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.with('students', 2).create()

    const response = await client
      .get('/advisor/enrollments')
      .qs({ classroomId: classroom.id })
      .cookies(admin)

    response.assertStatus(200)
    assert.lengthOf(body(response).students, 2)
  })

  test('sem ?classroomId responde 422 apontando o campo', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)

    const response = await client.get('/advisor/enrollments').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'classroomId')
  })

  test('sem sessão é 401, e o representante recebe 403', async ({ client, assert }) => {
    const classroom = await ClassroomFactory.create()
    const representante = await signInWithFactory(client, 'representative')

    const anonimo = await client.get('/advisor/enrollments').qs({ classroomId: classroom.id })
    const negado = await client
      .get('/advisor/enrollments')
      .qs({ classroomId: classroom.id })
      .cookies(representante.session)

    anonimo.assertStatus(401)
    negado.assertStatus(403)
    assert.equal(body(negado).code, 'ACCESS_DENIED')
  })
})
