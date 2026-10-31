import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { Stored } from '#tests/stored-fixtures'
import { drawnClassroom, classroomWithStudents } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('classrooms > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('deletes the classroom and its students go along', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await classroomWithStudents(2)

    const response = await client
      .delete(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)

    response.assertStatus(204)
    assert.isNull(await Stored.classroom(classroom.id))
    assert.lengthOf(await Stored.studentsOfClassroom(classroom.id), 0)
  })

  test('nonexistent classroom responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .delete(`/administrator/classrooms/${randomUUID()}`)
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('classroom in a drawn bracket responds 409 and stays', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await drawnClassroom()

    const response = await client
      .delete(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'CLASSROOM_IN_COMPETITION')
    assert.isNotNull(await Stored.classroom(classroom.id))
  })

  test('without a session responds 401, advisor responds 403', async ({ client, assert }) => {
    const classroom = await ClassroomFactory.create()

    const anonymous = await client.delete(`/administrator/classrooms/${classroom.id}`)
    anonymous.assertStatus(401)

    const advisor = await authenticateAsAdvisor(client)
    const response = await client
      .delete(`/administrator/classrooms/${classroom.id}`)
      .cookies(advisor)

    response.assertStatus(403)
    assert.isNotNull(await Stored.classroom(classroom.id))
  })
})

test.group('administrator/classrooms/delete > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('422: id that is not a uuid', async ({ client }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete('/administrator/classrooms/nao-e-uuid').cookies(admin)

    response.assertStatus(422)
  })
})
