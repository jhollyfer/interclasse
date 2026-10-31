import { test } from '@japa/runner'

import RepresentativeEnrollmentShowUseCase from './show.use-case.ts'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import {
  ENROLLMENT_IDS,
  REPRESENTATIVE_ACTOR,
  enrollmentWorld,
  seedWorldClassroom,
} from '#tests/enrollments-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const world = enrollmentWorld()
  await seedWorldClassroom(world.classrooms)
  const useCase = await makeWithMemory(RepresentativeEnrollmentShowUseCase, [
    [ClassroomRepository, world.classrooms],
    [EnrollmentRepository, world.enrollments],
  ])

  return { ...world, useCase }
}

test.group('representative/enrollments > show (unit)', () => {
  test('the matrix of the classroom they represent', async ({ assert }) => {
    const { useCase } = await setup()

    const board = rightOf(await useCase.execute({ actor: REPRESENTATIVE_ACTOR }))

    assert.equal(board.classroom.id, ENROLLMENT_IDS.classroom)
    assert.lengthOf(board.students, 2)
  })

  test('an already drawn sport comes locked for the representative', async ({ assert }) => {
    const { enrollments, useCase } = await setup()
    enrollments.markDrawn('F2', ENROLLMENT_IDS.sport)

    const board = rightOf(await useCase.execute({ actor: REPRESENTATIVE_ACTOR }))

    assert.isTrue(board.sports[0]?.locked)
  })

  test('without a linked classroom is 404 CLASSROOM_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      actor: { ...REPRESENTATIVE_ACTOR, id: ENROLLMENT_IDS.otherAdvisor },
    })

    assert.deepInclude(result.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
  })

  test('repository failure is 500 REPRESENTATIVE_ENROLLMENT_SHOW_ERROR', async ({ assert }) => {
    const { enrollments, useCase } = await setup()
    enrollments.board = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({ actor: REPRESENTATIVE_ACTOR })

    assert.deepInclude(result.value, {
      status: 500,
      code: 'REPRESENTATIVE_ENROLLMENT_SHOW_ERROR',
    })
  })
})
