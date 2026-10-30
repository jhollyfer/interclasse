import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { CATEGORY } from '@interclasse/shared'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { UserFactory } from '#database/factories/user.factory'
import { Stored } from '#tests/stored-fixtures'
import { drawnClassroom } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('classrooms > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('trocar o ano recalcula a categoria e a resposta traz as pessoas', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const advisor = await UserFactory.create()
    const classroom = await ClassroomFactory.merge({
      name: '4º A',
      grade: 4,
      category: CATEGORY.F1,
    }).create()

    const response = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ name: '6º A', grade: 6, advisorId: advisor.id })

    response.assertStatus(200)
    assert.equal(body(response).name, '6º A')
    assert.equal(body(response).grade, 6)
    assert.equal(body(response).category, CATEGORY.F2)
    assert.equal(body(response).advisor.id, advisor.id)
    assert.isNull(body(response).representative)
  })

  test('`null` desfaz o vínculo e campo ausente não mexe', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const advisor = await UserFactory.create()
    const classroom = await ClassroomFactory.merge({ advisorId: advisor.id }).create()

    const response = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ advisorId: null })

    response.assertStatus(200)
    assert.isNull(body(response).advisorId)
    assert.equal(body(response).name, classroom.name)
    assert.equal(body(response).grade, classroom.grade)
  })

  test('turma inexistente responde 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put(`/administrator/classrooms/${randomUUID()}`)
      .cookies(session)
      .json({ name: '5º Z' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('nome de outra turma responde 409; o próprio nome não', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const other = await ClassroomFactory.create()
    const classroom = await ClassroomFactory.create()

    const repetido = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ name: other.name })
    const proprio = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ name: classroom.name })

    repetido.assertStatus(409)
    assert.equal(body(repetido).code, 'CLASSROOM_ALREADY_EXISTS')
    assert.property(body(repetido).errors, 'name')
    proprio.assertStatus(200)
  })

  test('conta sem o papel do vínculo responde 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const representative = await UserFactory.apply('representative').create()
    const advisor = await UserFactory.create()
    const classroom = await ClassroomFactory.create()

    const conselheiro = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ advisorId: representative.id })
    const representante = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ representativeId: advisor.id })

    conselheiro.assertStatus(422)
    assert.equal(body(conselheiro).code, 'ADVISOR_NOT_FOUND')
    representante.assertStatus(422)
    assert.equal(body(representante).code, 'REPRESENTATIVE_NOT_FOUND')
  })

  test('representante de outra turma responde 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const representative = await UserFactory.apply('representative').create()
    await ClassroomFactory.merge({ representativeId: representative.id }).create()
    const classroom = await ClassroomFactory.create()

    const response = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ representativeId: representative.id })

    response.assertStatus(409)
    assert.equal(body(response).code, 'REPRESENTATIVE_TAKEN')
  })

  test('conselheiro de outra turma responde 409', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const advisor = await UserFactory.create()
    await ClassroomFactory.merge({ advisorId: advisor.id }).create()
    const classroom = await ClassroomFactory.create()

    const response = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ advisorId: advisor.id })

    response.assertStatus(409)
    assert.equal(body(response).code, 'ADVISOR_TAKEN')
  })

  test('turma sorteada não muda de categoria, mas muda de ano dentro dela', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await drawnClassroom(7)

    const outraCategoria = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ grade: 4 })
    const mesmaCategoria = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ grade: 8 })

    outraCategoria.assertStatus(409)
    assert.equal(body(outraCategoria).code, 'CLASSROOM_IN_COMPETITION')
    assert.property(body(outraCategoria).errors, 'grade')
    mesmaCategoria.assertStatus(200)
    assert.equal(body(mesmaCategoria).category, CATEGORY.F2)
  })

  test('ano fora da faixa responde 422 no campo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.create()

    const response = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ grade: 99 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'grade')
  })

  test('sem sessão responde 401, conselheiro responde 403', async ({ client, assert }) => {
    const classroom = await ClassroomFactory.create()

    const anonymous = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .json({ name: 'Invasão' })
    anonymous.assertStatus(401)

    const advisor = await authenticateAsAdvisor(client)
    const response = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(advisor)
      .json({ name: 'Invasão' })

    response.assertStatus(403)
    const intacta = await Stored.classroomOrFail(classroom.id)
    assert.equal(intacta.name, classroom.name)
  })

  test('nome vazio responde 422 e não grava', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.create()

    const response = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ name: '' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'name')
    const stored = await Stored.classroomOrFail(classroom.id)
    assert.equal(stored.name, classroom.name)
  })
})
