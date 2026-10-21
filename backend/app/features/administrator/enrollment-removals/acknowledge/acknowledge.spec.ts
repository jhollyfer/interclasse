import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import EnrollmentRemoval from '#models/enrollment-removal'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/helpers'

test.group('enrollment-removals > acknowledge', (group) => {
  group.each.setup(() => resetDatabase())

  test('dá ciência, e repetir mantém a primeira data', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.create()
    const sport = await SportFactory.create()
    const removal = await EnrollmentRemoval.create({
      classroomId: classroom.id,
      sportId: sport.id,
      studentName: 'Ana',
      reason: 'Saiu da escola',
    })

    const first = await client
      .patch(`/administrator/enrollment-removals/${removal.id}/acknowledge`)
      .cookies(session)
    const second = await client
      .patch(`/administrator/enrollment-removals/${removal.id}/acknowledge`)
      .cookies(session)

    first.assertStatus(200)
    second.assertStatus(200)
    assert.isNotNull(body(first).acknowledgedAt)
    assert.equal(body(second).acknowledgedAt, body(first).acknowledgedAt)
  })

  test('aviso inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .patch(`/administrator/enrollment-removals/${randomUUID()}/acknowledge`)
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'ENROLLMENT_REMOVAL_NOT_FOUND')
  })
})
