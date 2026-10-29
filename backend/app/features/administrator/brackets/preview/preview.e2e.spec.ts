import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { Classroom as ClassroomEntity } from '#domain/classroom/classroom.entity'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/helpers'

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
