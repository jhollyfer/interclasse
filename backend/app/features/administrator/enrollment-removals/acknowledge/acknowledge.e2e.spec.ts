import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { EnrollmentRemovalFactory } from '#database/factories/enrollment-removal.factory'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { SportFactory } from '#database/factories/sport.factory'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

test.group('enrollment-removals > acknowledge', (group) => {
  group.each.setup(() => resetDatabase())

  test('dá ciência, e repetir mantém a primeira data', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.create()
    const sport = await SportFactory.create()
    const removal = await EnrollmentRemovalFactory.merge({
      classroomId: classroom.id,
      sportId: sport.id,
      studentName: 'Ana',
      reason: 'Saiu da escola',
    }).create()

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

test.group('administrator/enrollment-removals/acknowledge > acesso e validação', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: sem sessão', async ({ client }) => {
    const response = await client.patch(
      '/administrator/enrollment-removals/00000000-0000-4000-8000-000000000000/acknowledge',
    )

    response.assertStatus(401)
  })

  test('403: conselheiro não alcança a rota da organização', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client
      .patch('/administrator/enrollment-removals/00000000-0000-4000-8000-000000000000/acknowledge')
      .cookies(advisor)

    response.assertStatus(403)
  })

  test('422: id que não é uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .patch('/administrator/enrollment-removals/nao-e-uuid/acknowledge')
      .cookies(admin)

    response.assertStatus(422)
  })
})
