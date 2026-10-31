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

  test('lists only the students of the advisor classrooms, in alphabetical order', async ({
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

  test('?classroomId of another advisor responds an empty list', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)
    const foreign = await classroomWithStudents(2)

    const response = await client
      .get('/advisor/students')
      .qs({ classroomId: foreign.id })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 0)
  })

  test('?search narrows by name', async ({ client, assert }) => {
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

  test('the administrator sees the students of all classrooms', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    await Promise.all([classroomWithStudents(2), classroomWithStudents(2)])

    const response = await client.get('/advisor/students').cookies(admin)

    response.assertStatus(200)
    assert.equal(body(response).meta.total, 4)
  })

  test('without a session is 401, and the representative gets 403', async ({ client, assert }) => {
    const representative = await signInWithFactory(client, 'representative')

    const anonymous = await client.get('/advisor/students')
    const denied = await client.get('/advisor/students').cookies(representative.session)

    anonymous.assertStatus(401)
    denied.assertStatus(403)
    assert.equal(body(denied).code, 'ACCESS_DENIED')
  })
})

test.group('advisor/students/paginate > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('malformed classroom filter responds 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const { session } = await signInWithFactory(client)

    const response = await client.get('/advisor/students').qs({ classroomId: 'x' }).cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'classroomId')
  })
})
