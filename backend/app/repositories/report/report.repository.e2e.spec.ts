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
 * The same contract in both implementations (`_standards/domain.md` §5.4). Each
 * arranges the same world its own way - rows in the database, rows in memory -
 * and the assertions are the same: a Fundamental 2 classroom with two students, one
 * of them enrolled in futsal.
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
    if (!athlete) throw new Error('arrangement without a student')
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

    test('counts classrooms, students, athletes, enrollments and sports', async ({ assert }) => {
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

    test('separates by category, with both categories always present', async ({ assert }) => {
      const repository = await arrange()

      const report = await repository.summarize()

      assert.deepEqual(report.byCategory, [
        { category: CATEGORY.F1, classrooms: 0, students: 0, athletes: 0 },
        { category: CATEGORY.F2, classrooms: 1, students: 2, athletes: 1 },
      ])
    })

    test('brings the sport and the classroom with their own totals', async ({ assert }) => {
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
