import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { Classroom as ClassroomEntity } from '#domain/classroom/classroom.entity'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

test.group('brackets > preview', (group) => {
  group.each.setup(() => resetDatabase())

  test('counts the enrolled of each classroom and says who enters', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.merge({ minAthletes: 2, maxAthletes: 5 }).create()
    const [full, empty] = await ClassroomFactory.merge({
      grade: 4,
      category: ClassroomEntity.categoryOf(4),
    }).createMany(2)
    if (!full || !empty) throw new Error('factory created fewer classrooms than requested')
    const students = await StudentFactory.merge({ classroomId: full.id }).createMany(2)
    for (const student of students)
      await EnrollmentFactory.merge({ studentId: student.id, sportId: sport.id }).create()
    await StudentFactory.merge({ classroomId: empty.id }).create()

    const response = await client
      .get('/administrator/brackets/preview')
      .qs({ sportId: sport.id, category: 'F1' })
      .cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).minAthletes, 2)
    assert.isFalse(body(response).drawn)
    const byId = Object.fromEntries(
      body(response).classrooms.map((row: { id: string; athletes: number; eligible: boolean }) => [
        row.id,
        { athletes: row.athletes, eligible: row.eligible },
      ]),
    )
    assert.deepEqual(byId, {
      [full.id]: { athletes: 2, eligible: true },
      [empty.id]: { athletes: 0, eligible: false },
    })
  })
})

test.group('administrator/brackets/preview > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.get('/administrator/brackets/preview')

    response.assertStatus(401)
  })

  test('403: advisor does not reach the organization route', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/brackets/preview').cookies(advisor)

    response.assertStatus(403)
  })
})

test.group('administrator/brackets/preview > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('malformed sport and missing category respond 422 pointing at the fields', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/brackets/preview?sportId=x').cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'sportId')
    assert.property(body(response).errors, 'category')
  })
})
