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

  test('changing the year recalculates the category and the response brings the people', async ({
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

  test('`null` undoes the link and a missing field leaves it alone', async ({ client, assert }) => {
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

  test('nonexistent classroom responds 404', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put(`/administrator/classrooms/${randomUUID()}`)
      .cookies(session)
      .json({ name: '5º Z' })

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })

  test('name of another classroom responds 409; its own name does not', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const other = await ClassroomFactory.create()
    const classroom = await ClassroomFactory.create()

    const duplicate = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ name: other.name })
    const own = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ name: classroom.name })

    duplicate.assertStatus(409)
    assert.equal(body(duplicate).code, 'CLASSROOM_ALREADY_EXISTS')
    assert.property(body(duplicate).errors, 'name')
    own.assertStatus(200)
  })

  test('account without the link role responds 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const representative = await UserFactory.apply('representative').create()
    const advisor = await UserFactory.create()
    const classroom = await ClassroomFactory.create()

    const advisorSession = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ advisorId: representative.id })
    const representativeSession = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ representativeId: advisor.id })

    advisorSession.assertStatus(422)
    assert.equal(body(advisorSession).code, 'ADVISOR_NOT_FOUND')
    representativeSession.assertStatus(422)
    assert.equal(body(representativeSession).code, 'REPRESENTATIVE_NOT_FOUND')
  })

  test('representative of another classroom responds 409', async ({ client, assert }) => {
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

  test('advisor of another classroom responds 409', async ({ client, assert }) => {
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

  test('drawn classroom does not change category, but changes year within it', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await drawnClassroom(7)

    const otherCategory = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ grade: 4 })
    const sameCategory = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ grade: 8 })

    otherCategory.assertStatus(409)
    assert.equal(body(otherCategory).code, 'CLASSROOM_IN_COMPETITION')
    assert.property(body(otherCategory).errors, 'grade')
    sameCategory.assertStatus(200)
    assert.equal(body(sameCategory).category, CATEGORY.F2)
  })

  test('year outside the range responds 422 on the field', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const classroom = await ClassroomFactory.create()

    const response = await client
      .put(`/administrator/classrooms/${classroom.id}`)
      .cookies(session)
      .json({ grade: 99 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'grade')
  })

  test('without a session responds 401, advisor responds 403', async ({ client, assert }) => {
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
    const untouched = await Stored.classroomOrFail(classroom.id)
    assert.equal(untouched.name, classroom.name)
  })

  test('empty name responds 422 and does not save', async ({ client, assert }) => {
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
