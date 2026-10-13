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
} from '#tests/helpers'

test.group('enrollments > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('a matriz da turma vinculada à sessão', async ({ client, assert }) => {
    const { session, classroom } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.create()
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
    await EnrollmentFactory.merge({ studentId: student.id, sportId: sport.id }).create()
    // Aluno de outra turma não entra na matriz.
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
        locked: false,
      },
    ])
    assert.deepEqual(body(response).students, [
      { id: student.id, name: student.name, sportIds: [sport.id] },
    ])
  })

  test('modalidade sorteada na categoria da turma aparece travada', async ({ client, assert }) => {
    const { session, classroom } = await signInAsRepresentativeOfClassroom(client)
    const sport = await SportFactory.create()
    await drawSport(sport, classroom)

    const response = await client.get('/representative/enrollments').cookies(session)

    response.assertStatus(200)
    assert.isTrue(body(response).sports[0].locked)
  })

  test('representante sem turma vinculada responde 404', async ({ client, assert }) => {
    const { session } = await signInWithFactory(client, 'representative')

    const response = await client.get('/representative/enrollments').cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('sem sessão é 401; conselheiro e administrador recebem 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const admin = await authenticateAsAdministrator(client)

    const anonimo = await client.get('/representative/enrollments')
    const negados = [
      await client.get('/representative/enrollments').cookies(advisor),
      await client.get('/representative/enrollments').cookies(admin),
    ]

    anonimo.assertStatus(401)
    for (const response of negados) {
      response.assertStatus(403)
      assert.equal(body(response).code, 'ACCESS_DENIED')
    }
  })
})
