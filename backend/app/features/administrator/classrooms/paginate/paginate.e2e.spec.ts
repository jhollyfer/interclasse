import { test } from '@japa/runner'
import { CATEGORY } from '@interclasse/shared'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { UserFactory } from '#database/factories/user.factory'
import { createSport, enrolledClassrooms } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('classrooms > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('returns the paginated envelope, ordered by name, with the people nested', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const advisor = await UserFactory.create()
    await ClassroomFactory.merge({ name: '8º B', grade: 8, category: CATEGORY.F2 }).create()
    await ClassroomFactory.merge({
      name: '6º A',
      grade: 6,
      category: CATEGORY.F2,
      advisorId: advisor.id,
    }).create()

    const response = await client.get('/administrator/classrooms').cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).meta.total, 2)
    assert.deepEqual(
      body(response).data.map((classroom: { name: string }) => classroom.name),
      ['6º A', '8º B'],
    )
    assert.equal(body(response).data[0].advisor.id, advisor.id)
    assert.isNull(body(response).data[1].advisor)
  })

  test('each classroom brings the totals of students, athletes and sports', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const futsal = await createSport(client, session)
    const volleyball = await createSport(client, session, 1, 'Vôlei')
    const [classroomId] = await enrolledClassrooms(client, session, futsal.id, 1)
    // The same student also in volleyball, and a second student who plays nothing.
    const students = await client.get('/advisor/students').qs({ classroomId }).cookies(session)
    await client
      .put('/advisor/enrollments')
      .cookies(session)
      .json({ classroomId, sportId: volleyball.id, studentIds: [body(students).data[0].id] })
    await client.post('/advisor/students').cookies(session).json({ classroomId, name: 'Reserva' })

    const response = await client.get('/administrator/classrooms').cookies(session)

    response.assertStatus(200)
    assert.deepInclude(body(response).data[0], {
      studentsCount: 2,
      athletesCount: 1,
      sportsCount: 2,
    })
  })

  test('`?category` and `?search` narrow the list', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await ClassroomFactory.merge({ name: '4º A', grade: 4, category: CATEGORY.F1 }).create()
    await ClassroomFactory.merge({ name: '7º A', grade: 7, category: CATEGORY.F2 }).create()
    await ClassroomFactory.merge({ name: '9º C', grade: 9, category: CATEGORY.F2 }).create()

    const byCategory = await client
      .get('/administrator/classrooms')
      .qs({ category: CATEGORY.F1 })
      .cookies(session)
    const byName = await client
      .get('/administrator/classrooms')
      .qs({ search: '9º' })
      .cookies(session)

    byCategory.assertStatus(200)
    assert.deepEqual(
      body(byCategory).data.map((classroom: { name: string }) => classroom.name),
      ['4º A'],
    )
    byName.assertStatus(200)
    assert.deepEqual(
      body(byName).data.map((classroom: { name: string }) => classroom.name),
      ['9º C'],
    )
  })

  test('`?sort` e `?direction` trocam a ordem', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await ClassroomFactory.merge({ name: 'A', grade: 9, category: CATEGORY.F2 }).create()
    await ClassroomFactory.merge({ name: 'B', grade: 3, category: CATEGORY.F1 }).create()

    const response = await client
      .get('/administrator/classrooms')
      .qs({ sort: 'grade', direction: 'desc' })
      .cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((classroom: { grade: number }) => classroom.grade),
      [9, 3],
    )
  })

  test('category or sort column outside the list responds 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const category = await client
      .get('/administrator/classrooms')
      .qs({ category: 'F9' })
      .cookies(session)
    const sorting = await client
      .get('/administrator/classrooms')
      .qs({ sort: 'password' })
      .cookies(session)

    category.assertStatus(422)
    assert.property(body(category).errors, 'category')
    sorting.assertStatus(422)
    assert.property(body(sorting).errors, 'sort')
  })

  test('without a session responds 401, representative responds 403', async ({
    client,
    assert,
  }) => {
    const anonymous = await client.get('/administrator/classrooms')
    anonymous.assertStatus(401)

    const { session } = await signInWithFactory(client, 'representative')
    const response = await client.get('/administrator/classrooms').cookies(session)

    response.assertStatus(403)
    assert.equal(body(response).code, 'ACCESS_DENIED')
  })
})
