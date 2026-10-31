import { test } from '@japa/runner'

import AdvisorEnrollmentShowUseCase from './show.use-case.ts'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import {
  ADVISOR_ACTOR,
  ENROLLMENT_IDS,
  OTHER_ADVISOR_ACTOR,
  enrollmentWorld,
  seedWorldClassroom,
} from '#tests/enrollments-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const world = enrollmentWorld()
  await seedWorldClassroom(world.classrooms)
  const useCase = await makeWithMemory(AdvisorEnrollmentShowUseCase, [
    [ClassroomRepository, world.classrooms],
    [EnrollmentRepository, world.enrollments],
  ])

  return { ...world, useCase }
}

test.group('advisor/enrollments > show (unit)', () => {
  test('the own classroom matrix, with students and sports', async ({ assert }) => {
    const { enrollments, useCase } = await setup()
    enrollments.withList({ classroomId: ENROLLMENT_IDS.classroom, sportId: ENROLLMENT_IDS.sport }, [
      ENROLLMENT_IDS.ana,
    ])

    const board = rightOf(
      await useCase.execute({ classroomId: ENROLLMENT_IDS.classroom, actor: ADVISOR_ACTOR }),
    )

    assert.equal(board.classroom.name, '7º A')
    assert.deepEqual(
      board.students.map((student) => [student.name, student.sportIds.length]),
      [
        ['Ana', 1],
        ['Bia', 0],
      ],
    )
    assert.isFalse(board.sports[0]?.locked)
  })

  test('classroom of another advisor is 404 CLASSROOM_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      classroomId: ENROLLMENT_IDS.classroom,
      actor: OTHER_ADVISOR_ACTOR,
    })

    assert.deepInclude(result.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
  })

  test('repository failure is 500 ADVISOR_ENROLLMENT_SHOW_ERROR', async ({ assert }) => {
    const { enrollments, useCase } = await setup()
    enrollments.board = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({
      classroomId: ENROLLMENT_IDS.classroom,
      actor: ADVISOR_ACTOR,
    })

    assert.deepInclude(result.value, { status: 500, code: 'ADVISOR_ENROLLMENT_SHOW_ERROR' })
  })
})
