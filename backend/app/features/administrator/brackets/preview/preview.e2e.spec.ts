import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { Classroom as ClassroomEntity } from '#domain/classroom/classroom.entity'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

test.group('brackets > preview', (group) => {
  group.each.setup(() => resetDatabase())

  test('conta os inscritos de cada turma e diz quem entra', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const sport = await SportFactory.merge({ minAthletes: 2, maxAthletes: 5 }).create()
    const [cheia, vazia] = await ClassroomFactory.merge({
      grade: 4,
      category: ClassroomEntity.categoryOf(4),
    }).createMany(2)
    if (!cheia || !vazia) throw new Error('factory criou menos turmas que o pedido')
    const alunos = await StudentFactory.merge({ classroomId: cheia.id }).createMany(2)
    for (const aluno of alunos)
      await EnrollmentFactory.merge({ studentId: aluno.id, sportId: sport.id }).create()
    await StudentFactory.merge({ classroomId: vazia.id }).create()

    const response = await client
      .get('/administrator/brackets/preview')
      .qs({ sportId: sport.id, category: 'F1' })
      .cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).minAthletes, 2)
    assert.isFalse(body(response).drawn)
    const byId = Object.fromEntries(
      body(response).classrooms.map((row: { id: string; athletes: number; eligible: boolean }) => [
        row.id,
        { athletes: row.athletes, eligible: row.eligible },
      ]),
    )
    assert.deepEqual(byId, {
      [cheia.id]: { athletes: 2, eligible: true },
      [vazia.id]: { athletes: 0, eligible: false },
    })
  })
})

test.group('administrator/brackets/preview > acesso e validação', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: sem sessão', async ({ client }) => {
    const response = await client.get('/administrator/brackets/preview')

    response.assertStatus(401)
  })

  test('403: conselheiro não alcança a rota da organização', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/brackets/preview').cookies(advisor)

    response.assertStatus(403)
  })
})

test.group('administrator/brackets/preview > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('modalidade malformada e categoria ausente respondem 422 apontando os campos', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.get('/administrator/brackets/preview?sportId=x').cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'sportId')
    assert.property(body(response).errors, 'category')
  })
})
