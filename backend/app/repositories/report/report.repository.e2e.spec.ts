import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { CATEGORY } from '@interclasse/shared'

import { ReportLucidRepository } from './report.lucid.repository.ts'
import { ReportMemoryRepository } from './report.memory.repository.ts'
import type { ReportRepository } from './report.repository.ts'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { resetDatabase } from '#tests/http-fixtures'

/**
 * O mesmo contrato nas duas implementações (`_standards/domain.md` §5.4). Cada
 * uma arranja o mesmo mundo do seu jeito - linhas no banco, linhas na memória -
 * e as asserções são iguais: uma turma do Fundamental 2 com dois alunos, um
 * deles inscrito no futsal.
 */
type Arranged = ReportRepository

const IMPLEMENTATIONS = {
  lucid: async (): Promise<Arranged> => {
    const classroom = await ClassroomFactory.merge({
      name: '7º A',
      grade: 7,
      category: CATEGORY.F2,
    }).create()
    const students = await StudentFactory.merge({ classroomId: classroom.id }).createMany(2)
    const sport = await SportFactory.merge({ name: 'Futsal' }).create()
    const [athlete] = students
    if (!athlete) throw new Error('arranjo sem aluno')
    await EnrollmentFactory.merge({ studentId: athlete.id, sportId: sport.id }).create()

    return app.container.make(ReportLucidRepository)
  },
  memory: async (): Promise<Arranged> => {
    const classroomId = randomUUID()
    const sportId = randomUUID()
    const athleteId = randomUUID()

    return new ReportMemoryRepository()
      .withClassroom({ id: classroomId, name: '7º A', grade: 7, category: CATEGORY.F2 })
      .withStudent(athleteId, classroomId)
      .withStudent(randomUUID(), classroomId)
      .withSport(sportId, 'Futsal')
      .withEnrollment(athleteId, sportId)
  },
} satisfies Record<string, () => Promise<Arranged>>

for (const [name, arrange] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`ReportRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('conta turmas, alunos, atletas, inscrições e modalidades', async ({ assert }) => {
      const repository = await arrange()

      const report = await repository.summarize()

      assert.deepEqual(report.totals, {
        classrooms: 1,
        students: 2,
        athletes: 1,
        enrollments: 1,
        sports: 1,
        matchesPlayed: 0,
        matchesScheduled: 0,
      })
    })

    test('separa por categoria, com as duas categorias sempre presentes', async ({ assert }) => {
      const repository = await arrange()

      const report = await repository.summarize()

      assert.deepEqual(report.byCategory, [
        { category: CATEGORY.F1, classrooms: 0, students: 0, athletes: 0 },
        { category: CATEGORY.F2, classrooms: 1, students: 2, athletes: 1 },
      ])
    })

    test('traz a modalidade e a turma com os próprios totais', async ({ assert }) => {
      const repository = await arrange()

      const report = await repository.summarize()

      assert.deepInclude(report.bySport[0], { name: 'Futsal', athletes: 1, classrooms: 1 })
      assert.deepInclude(report.classrooms[0], {
        name: '7º A',
        category: CATEGORY.F2,
        advisor: null,
        students: 2,
        athletes: 1,
        sports: 1,
      })
    })
  })
}
