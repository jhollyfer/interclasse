import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import type { Category } from '@interclasse/shared'

import { EnrollmentLucidRepository } from './enrollment.lucid.repository.ts'
import { EnrollmentMemoryRepository } from './enrollment.memory.repository.ts'
import type { EnrollmentRepository } from './enrollment.repository.ts'

import { resetDatabase } from '#tests/http-fixtures'
import { Classroom } from '#domain/classroom/classroom.entity'
import { Enrollment } from '#domain/enrollment/enrollment.entity'
import { BracketFactory } from '#database/factories/bracket.factory'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'

type World = { id: string; name: string; category: Category }

/**
 * What each implementation needs for the test to arrange the world: sport,
 * classroom, students and the draw. The contract runs the same on both
 * (`_standards/domain.md` §5.4).
 */
type Harness = {
  readonly repository: EnrollmentRepository
  sport(name: string, maxAthletes: number): Promise<string>
  classroom(name: string, grade: number): Promise<World>
  student(classroomId: string, name: string): Promise<string>
  draw(classroom: World, sportId: string): Promise<void>
}

const IMPLEMENTATIONS = {
  lucid: async (): Promise<Harness> => ({
    repository: await app.container.make(EnrollmentLucidRepository),
    async sport(name, maxAthletes) {
      const sport = await SportFactory.merge({ name, maxAthletes }).create()
      return sport.id
    },
    async classroom(name, grade) {
      const category = Classroom.categoryOf(grade)
      const classroom = await ClassroomFactory.merge({ name, grade, category }).create()
      return { id: classroom.id, name, category }
    },
    async student(classroomId, name) {
      const student = await StudentFactory.merge({ classroomId, name }).create()
      return student.id
    },
    async draw(classroom, sportId) {
      await BracketFactory.merge({ sportId, category: classroom.category }).create()
    },
  }),
  memory: async (): Promise<Harness> => {
    const repository = new EnrollmentMemoryRepository()

    return {
      repository,
      async sport(name, maxAthletes) {
        const id = randomUUID()
        repository.withSport({ id, name, minAthletes: 1, maxAthletes })
        return id
      },
      async classroom(name, grade) {
        const world = { id: randomUUID(), name, category: Classroom.categoryOf(grade) }
        repository.withClassroom(world)
        return world
      },
      async student(classroomId, name) {
        const id = randomUUID()
        repository.withStudent(classroomId, { id, name })
        return id
      },
      async draw(classroom, sportId) {
        repository.markDrawn(classroom.category, sportId)
      },
    }
  },
} satisfies Record<string, () => Promise<Harness>>

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`EnrollmentRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('findSport returns the ceiling; a nonexistent sport is null', async ({ assert }) => {
      const { repository, sport } = await make()
      const futsal = await sport('Futsal', 12)

      assert.deepEqual(await repository.findSport(futsal), { id: futsal, maxAthletes: 12 })
      assert.isNull(await repository.findSport(randomUUID()))
    })

    test('studentsOf lists the classroom students by name', async ({ assert }) => {
      const { repository, classroom, student } = await make()
      const seven = await classroom('7º A', 7)
      const other = await classroom('8º A', 8)
      const bia = await student(seven.id, 'Bia')
      const ana = await student(seven.id, 'Ana')
      await student(other.id, 'Caio')

      assert.deepEqual(await repository.studentsOf(seven.id), [
        { id: ana, name: 'Ana' },
        { id: bia, name: 'Bia' },
      ])
    })

    test('isDrawn looks at the classroom category', async ({ assert }) => {
      const { repository, classroom, sport, draw } = await make()
      const futsal = await sport('Futsal', 12)
      const f2 = await classroom('9º A', 9)
      const f1 = await classroom('4º A', 4)

      assert.isFalse(await repository.isDrawn({ classroomId: f2.id, sportId: futsal }))
      await draw(f2, futsal)
      assert.isTrue(await repository.isDrawn({ classroomId: f2.id, sportId: futsal }))
      assert.isFalse(await repository.isDrawn({ classroomId: f1.id, sportId: futsal }))
    })

    test('save swaps the classroom list and findForUpdate returns it', async ({ assert }) => {
      const { repository, classroom, sport, student } = await make()
      const futsal = await sport('Futsal', 12)
      const seven = await classroom('7º A', 7)
      const ana = await student(seven.id, 'Ana')
      const bia = await student(seven.id, 'Bia')
      const key = { classroomId: seven.id, sportId: futsal }

      const empty = await repository.findForUpdate(key)
      await repository.save(Enrollment.restore({ ...key, studentIds: [ana] }))
      await repository.save(Enrollment.restore({ ...key, studentIds: [bia] }))
      const replaced = await repository.findForUpdate(key)

      assert.deepEqual(empty.snapshot().studentIds, [])
      assert.deepEqual(replaced.snapshot().studentIds, [bia])
    })

    test("save of one classroom does not touch another one's list in the same sport", async ({
      assert,
    }) => {
      const { repository, classroom, sport, student } = await make()
      const futsal = await sport('Futsal', 12)
      const seven = await classroom('7º A', 7)
      const eight = await classroom('8º A', 8)
      const ana = await student(seven.id, 'Ana')
      const caio = await student(eight.id, 'Caio')
      await repository.save(
        Enrollment.restore({ classroomId: eight.id, sportId: futsal, studentIds: [caio] }),
      )

      await repository.save(
        Enrollment.restore({ classroomId: seven.id, sportId: futsal, studentIds: [ana] }),
      )
      await repository.save(
        Enrollment.restore({ classroomId: seven.id, sportId: futsal, studentIds: [] }),
      )

      const kept = await repository.findForUpdate({ classroomId: eight.id, sportId: futsal })
      assert.deepEqual(kept.snapshot().studentIds, [caio])
    })

    test('board: classroom, sports by name, students with what they play and the lock', async ({
      assert,
    }) => {
      const { repository, classroom, sport, student, draw } = await make()
      const volleyball = await sport('Vôlei', 8)
      const futsal = await sport('Futsal', 12)
      const seven = await classroom('7º A', 7)
      const ana = await student(seven.id, 'Ana')
      await student(seven.id, 'Bia')
      await repository.save(
        Enrollment.restore({ classroomId: seven.id, sportId: futsal, studentIds: [ana] }),
      )
      await draw(seven, futsal)

      const advisor = await repository.board({ classroomId: seven.id, lockAfterDraw: false })
      const representative = await repository.board({ classroomId: seven.id, lockAfterDraw: true })

      assert.deepEqual(advisor?.classroom, { id: seven.id, name: '7º A', category: 'F2' })
      assert.deepEqual(
        advisor?.sports.map((item) => [item.id, item.drawn, item.locked]),
        [
          [futsal, true, false],
          [volleyball, false, false],
        ],
      )
      assert.deepEqual(
        representative?.sports.map((item) => [item.id, item.drawn, item.locked]),
        [
          [futsal, true, true],
          [volleyball, false, false],
        ],
      )
      assert.deepEqual(
        advisor?.students.map((item) => [item.name, item.sportIds]),
        [
          ['Ana', [futsal]],
          ['Bia', []],
        ],
      )
    })

    test('board of a nonexistent classroom is null', async ({ assert }) => {
      const { repository } = await make()

      assert.isNull(await repository.board({ classroomId: randomUUID(), lockAfterDraw: false }))
    })
  })
}
