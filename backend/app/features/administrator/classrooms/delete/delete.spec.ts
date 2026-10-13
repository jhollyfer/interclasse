import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import Classroom from '#models/classroom'
import Student from '#models/student'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { drawnClassroom } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('classrooms > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('apaga a turma e os alunos dela vão junto', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.with('students', 2).create()

    const response = await client
      .delete(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)

    response.assertStatus(204)
    assert.isNull(await Classroom.find(classroom.id))
    assert.lengthOf(await Student.query().where('classroomId', classroom.id), 0)
  })

  test('turma inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .delete(`/administrator/classrooms/${randomUUID()}`)
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('turma numa chave sorteada responde 409 e continua lá', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await drawnClassroom()

    const response = await client
      .delete(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)

    response.assertStatus(409)
    assert.equal(body(response).code, 'CLASSROOM_IN_COMPETITION')
    assert.isNotNull(await Classroom.find(classroom.id))
  })

  test('sem sessão responde 401, conselheiro responde 403', async ({ client, assert }) => {
    const classroom = await ClassroomFactory.create()

    const anonymous = await client.delete(`/administrator/classrooms/${classroom.id}`)
    anonymous.assertStatus(401)

    const advisor = await authenticateAsAdvisor(client)
    const response = await client
      .delete(`/administrator/classrooms/${classroom.id}`)
      .cookies(advisor)

    response.assertStatus(403)
    assert.isNotNull(await Classroom.find(classroom.id))
  })
})
