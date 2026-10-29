import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { StudentFactory } from '#database/factories/student.factory'
import { signInAsAdvisorOfClassroom } from '#tests/classrooms-fixtures'
import { authenticateAsAdministrator, body, resetDatabase, signInWithFactory } from '#tests/helpers'

test.group('students > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('o conselheiro corrige o nome do aluno da própria turma', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()

    const response = await client
      .put(`/advisor/students/${student.id}`)
      .cookies(session)
      .json({ name: '  Maria Clara  ' })

    response.assertStatus(200)
    assert.equal(body(response).id, student.id)
    assert.equal(body(response).name, 'Maria Clara')
    assert.equal(body(response).classroomId, classroom.id)

    await student.refresh()
    assert.equal(student.name, 'Maria Clara')
  })

  test('aluno de outro conselheiro responde 404 e fica intocado', async ({ client, assert }) => {
    const { classroom } = await signInAsAdvisorOfClassroom(client)
    const outro = await signInWithFactory(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id, name: 'Ana' }).create()

    const response = await client
      .put(`/advisor/students/${student.id}`)
      .cookies(outro.session)
      .json({ name: 'Outra' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'STUDENT_NOT_FOUND')

    await student.refresh()
    assert.equal(student.name, 'Ana')
  })

  test('aluno inexistente responde o mesmo 404', async ({ client, assert }) => {
    const { session } = await signInAsAdvisorOfClassroom(client)

    const response = await client
      .put(`/advisor/students/${randomUUID()}`)
      .cookies(session)
      .json({ name: 'Ninguém' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'STUDENT_NOT_FOUND')
  })

  test('o administrador corrige aluno de qualquer turma', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const student = await StudentFactory.with('classroom').create()

    const response = await client
      .put(`/advisor/students/${student.id}`)
      .cookies(admin)
      .json({ name: 'Corrigido' })

    response.assertStatus(200)
    await student.refresh()
    assert.equal(student.name, 'Corrigido')
  })

  test('nome vazio responde 422 apontando o campo', async ({ client, assert }) => {
    const { session, classroom } = await signInAsAdvisorOfClassroom(client)
    const student = await StudentFactory.merge({ classroomId: classroom.id }).create()

    const response = await client
      .put(`/advisor/students/${student.id}`)
      .cookies(session)
      .json({ name: '' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'name')
  })

  test('sem sessão é 401, e o representante recebe 403', async ({ client, assert }) => {
    const student = await StudentFactory.with('classroom').create()
    const representante = await signInWithFactory(client, 'representative')

    const anonimo = await client.put(`/advisor/students/${student.id}`).json({ name: 'X' })
    const negado = await client
      .put(`/advisor/students/${student.id}`)
      .cookies(representante.session)
      .json({ name: 'X' })

    anonimo.assertStatus(401)
    negado.assertStatus(403)
    assert.equal(body(negado).code, 'ACCESS_DENIED')
  })
})
