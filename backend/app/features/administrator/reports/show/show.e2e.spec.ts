import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { createSport, enrolledClassrooms } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('reports > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('counts classrooms, students and athletes in total, by category and by sport', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    await enrolledClassrooms(client, admin, sport.id, 2)
    // A Fundamental 1 classroom with nobody enrolled.
    await ClassroomFactory.merge({ name: '3º Z', grade: 3, category: 'F1' }).create()

    const response = await client.get('/administrator/reports').cookies(admin)

    response.assertStatus(200)
    assert.deepInclude(body(response).totals, {
      classrooms: 3,
      students: 2,
      athletes: 2,
      enrollments: 2,
      sports: 1,
    })
    const f2 = body(response).byCategory.find((row: { category: string }) => row.category === 'F2')
    assert.deepInclude(f2, { classrooms: 2, athletes: 2 })
    assert.deepInclude(body(response).bySport[0], { athletes: 2, classrooms: 2 })
    assert.lengthOf(body(response).classrooms, 3)
  })

  test('the CSV opens in Excel: BOM, semicolon and neutralized formula', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    await ClassroomFactory.merge({ name: '=1+1', grade: 7, category: 'F2' }).create()

    const response = await client.get('/administrator/reports/csv').cookies(admin)

    response.assertStatus(200)
    assert.include(response.header('content-type'), 'text/csv')
    assert.include(response.header('content-disposition'), 'attachment')
    const text = response.text()
    assert.isTrue(text.startsWith('﻿"Turma";"Categoria"'))
    assert.include(text, `"'=1+1";"Fundamental 2"`)
    assert.include(text, '"Total";"1 turmas"')
  })

  test('only the administrator sees the report', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/reports').cookies(advisor)

    response.assertStatus(403)
  })
})

test.group('administrator/reports/show > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.get('/administrator/reports')

    response.assertStatus(401)
  })
})
