import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { EnrollmentRemovalFactory } from '#database/factories/enrollment-removal.factory'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { SportFactory } from '#database/factories/sport.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('enrollment-removals > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('lists the notices and narrows to the pending ones', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.create()
    const sport = await SportFactory.create()
    await EnrollmentRemovalFactory.merge([
      {
        classroomId: classroom.id,
        sportId: sport.id,
        studentName: 'Ana',
        reason: 'Saiu da escola',
      },
      {
        classroomId: classroom.id,
        sportId: sport.id,
        studentName: 'Bia',
        reason: 'Machucou o pé',
        acknowledgedAt: DateTime.now(),
      },
    ]).createMany(2)

    const all = await client.get('/administrator/enrollment-removals').cookies(session)
    const pending = await client
      .get('/administrator/enrollment-removals')
      .qs({ pending: true })
      .cookies(session)

    all.assertStatus(200)
    assert.equal(body(all).meta.total, 2)
    assert.equal(body(all).data[0].studentName, 'Ana')
    assert.equal(body(all).data[0].classroom.name, classroom.name)
    pending.assertStatus(200)
    assert.equal(body(pending).meta.total, 1)
  })

  test('advisor responds 403', async ({ client }) => {
    const session = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/enrollment-removals').cookies(session)

    response.assertStatus(403)
  })
})

test.group('administrator/enrollment-removals/paginate > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.get('/administrator/enrollment-removals')

    response.assertStatus(401)
  })
})

test.group('administrator/enrollment-removals/paginate > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('malformed classroom filter responds 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .get('/administrator/enrollment-removals')
      .qs({ classroomId: 'x' })
      .cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'classroomId')
  })
})
