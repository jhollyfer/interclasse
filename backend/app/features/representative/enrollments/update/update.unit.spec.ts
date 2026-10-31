import { test } from '@japa/runner'

import RepresentativeEnrollmentUpdateUseCase from './update.use-case.ts'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import { EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { makeWithMemory } from '#tests/container-fixtures'
import {
  ENROLLMENT_IDS,
  REPRESENTATIVE_ACTOR,
  enrollmentWorld,
  seedWorldClassroom,
} from '#tests/enrollments-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

const KEY = { classroomId: ENROLLMENT_IDS.classroom, sportId: ENROLLMENT_IDS.sport }

async function setup() {
  const world = enrollmentWorld()
  await seedWorldClassroom(world.classrooms)
  const useCase = await makeWithMemory(RepresentativeEnrollmentUpdateUseCase, [
    [ClassroomRepository, world.classrooms],
    [EnrollmentRepository, world.enrollments],
    [EnrollmentRemovalRepository, world.removals],
    [UnitOfWork, world.unitOfWork],
  ])

  return { ...world, useCase }
}

test.group('representative/enrollments > update (unit)', () => {
  test('enrolls students of the own classroom', async ({ assert }) => {
    const { useCase } = await setup()

    const board = rightOf(
      await useCase.execute({
        sportId: ENROLLMENT_IDS.sport,
        studentIds: [ENROLLMENT_IDS.ana],
        actor: REPRESENTATIVE_ACTOR,
      }),
    )

    assert.deepEqual(
      board.students.map((student) => student.sportIds.length),
      [1, 0],
    )
  })

  test('removing an athlete is 403 ENROLLMENT_REMOVAL_FORBIDDEN and the list stays', async ({
    assert,
  }) => {
    const { enrollments, useCase } = await setup()
    enrollments.withList(KEY, [ENROLLMENT_IDS.ana])

    const result = await useCase.execute({
      sportId: ENROLLMENT_IDS.sport,
      studentIds: [],
      actor: REPRESENTATIVE_ACTOR,
    })

    assert.deepInclude(result.value, { status: 403, code: 'ENROLLMENT_REMOVAL_FORBIDDEN' })
    const stored = await enrollments.findForUpdate(KEY)
    assert.deepEqual(stored.snapshot().studentIds, [ENROLLMENT_IDS.ana])
  })

  test('an already drawn sport is 409 ENROLLMENT_LOCKED', async ({ assert }) => {
    const { enrollments, useCase } = await setup()
    enrollments.markDrawn('F2', ENROLLMENT_IDS.sport)

    const result = await useCase.execute({
      sportId: ENROLLMENT_IDS.sport,
      studentIds: [ENROLLMENT_IDS.ana],
      actor: REPRESENTATIVE_ACTOR,
    })

    assert.deepInclude(result.value, { status: 409, code: 'ENROLLMENT_LOCKED' })
  })

  test('without a linked classroom is 404 CLASSROOM_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      sportId: ENROLLMENT_IDS.sport,
      studentIds: [],
      actor: { ...REPRESENTATIVE_ACTOR, id: ENROLLMENT_IDS.otherAdvisor },
    })

    assert.deepInclude(result.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
  })

  test('repository failure is 500 REPRESENTATIVE_ENROLLMENT_UPDATE_ERROR', async ({ assert }) => {
    const { enrollments, useCase } = await setup()
    enrollments.findSport = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({
      sportId: ENROLLMENT_IDS.sport,
      studentIds: [],
      actor: REPRESENTATIVE_ACTOR,
    })

    assert.deepInclude(result.value, {
      status: 500,
      code: 'REPRESENTATIVE_ENROLLMENT_UPDATE_ERROR',
    })
  })
})
