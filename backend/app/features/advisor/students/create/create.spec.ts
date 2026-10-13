import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import Student from '#models/student'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { signInAsAdvisorOfClassroom } from '#tests/classrooms-fixtures'
import { authenticateAsAdministrator, body, resetDatabase, signInWithFactory } from '#tests/helpers'

test.group('students > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('o conselheiro cadastra aluno na própria turma', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)

    const response = await client
      .post('/advisor/students')
      .cookies(session)
      .json({ classroomId: classroom.id, name: '  Maria  ' })

    response.assertStatus(201)
    assert.equal(body(response).name, 'Maria')
    assert.equal(body(response).classroomId, classroom.id)
    assert.isString(body(response).id)
    assert.isNotNull(await Student.find(body(response).id))
  })

  test('turma de outro conselheiro responde 404, como se não existisse', async ({
    client,
    assert,
  }) => {
    const { classroom } = await signInAsAdvisorOfClassroom(client)
    const outro = await signInWithFactory(client)

    const response = await client
      .post('/advisor/students')
      .cookies(outro.session)
      .json({ classroomId: classroom.id, name: 'João' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
    assert.lengthOf(await Student.query().where('classroomId', classroom.id), 0)
  })

  test('turma inexistente responde o mesmo 404', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)

    const response = await client
      .post('/advisor/students')
      .cookies(session)
      .json({ classroomId: randomUUID(), name: 'João' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('o administrador cadastra em qualquer turma', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.create()

    const response = await client
      .post('/advisor/students')
      .cookies(admin)
      .json({ classroomId: classroom.id, name: 'Ana' })

    response.assertStatus(201)
    assert.equal(body(response).classroomId, classroom.id)
  })

  test('nome vazio responde 422 apontando o campo', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)

    const response = await client
      .post('/advisor/students')
      .cookies(session)
      .json({ classroomId: classroom.id, name: '   ' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'name')
  })

  test('sem sessão é 401, e o representante recebe 403', async ({ client, assert }) => {
    const classroom = await ClassroomFactory.create()
    const representante = await signInWithFactory(client, 'representative')
    const payload = { classroomId: classroom.id, name: 'Caio' }

    const anonimo = await client.post('/advisor/students').json(payload)
    const negado = await client
      .post('/advisor/students')
      .cookies(representante.session)
      .json(payload)

    anonimo.assertStatus(401)
    negado.assertStatus(403)
    assert.equal(body(negado).code, 'ACCESS_DENIED')
  })
})
