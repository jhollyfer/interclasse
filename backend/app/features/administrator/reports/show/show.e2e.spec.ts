import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { createSport, enrolledClassrooms } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('reports > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('conta turmas, alunos e atletas no total, por categoria e por modalidade', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    await enrolledClassrooms(client, admin, sport.id, 2)
    // Uma turma do Fundamental 1 sem ninguém inscrito.
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

  test('o CSV abre no Excel: BOM, ponto e vírgula e fórmula neutralizada', async ({
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

  test('só o administrador vê o relatório', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/reports').cookies(advisor)

    response.assertStatus(403)
  })
})
