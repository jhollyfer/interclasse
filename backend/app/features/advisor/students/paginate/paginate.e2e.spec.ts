import { test } from '@japa/runner'

import { StudentFactory } from '#database/factories/student.factory'
import { signInAsAdvisorOfClassroom, classroomWithStudents } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('students > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('lista só os alunos das turmas do conselheiro, em ordem alfabética', async ({
    client,
    assert,
  }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    await StudentFactory.merge([
      { classroomId: classroom.id, name: 'Bruno' },
      { classroomId: classroom.id, name: 'Ana' },
    ]).createMany(2)
    await StudentFactory.with('classroom').merge({ name: 'Alheio' }).create()

    const response = await client.get('/advisor/students').cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((student: { name: string }) => student.name),
      ['Ana', 'Bruno'],
    )
    assert.equal(body(response).meta.total, 2)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('?classroomId de outro conselheiro responde lista vazia', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)
    const alheia = await classroomWithStudents(2)

    const response = await client
      .get('/advisor/students')
      .qs({ classroomId: alheia.id })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 0)
  })

  test('?search recorta pelo nome', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    await StudentFactory.merge([
      { classroomId: classroom.id, name: 'Joana Ribeiro' },
      { classroomId: classroom.id, name: 'Pedro Lima' },
    ]).createMany(2)

    const response = await client.get('/advisor/students').qs({ search: 'joana' }).cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].name, 'Joana Ribeiro')
  })

  test('o administrador enxerga os alunos de todas as turmas', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    await Promise.all([classroomWithStudents(2), classroomWithStudents(2)])

    const response = await client.get('/advisor/students').cookies(admin)

    response.assertStatus(200)
    assert.equal(body(response).meta.total, 4)
  })

  test('sem sessão é 401, e o representante recebe 403', async ({ client, assert }) => {
    const representante = await signInWithFactory(client, 'representative')

    const anonimo = await client.get('/advisor/students')
    const negado = await client.get('/advisor/students').cookies(representante.session)

    anonimo.assertStatus(401)
    negado.assertStatus(403)
    assert.equal(body(negado).code, 'ACCESS_DENIED')
  })
})
