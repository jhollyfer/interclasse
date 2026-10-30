import { test } from '@japa/runner'

import AdvisorEnrollmentUpdateUseCase from './update.use-case.ts'

import type { EnrollmentRemoval } from '#domain/enrollment-removal/enrollment-removal.entity'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import { EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { makeWithMemory } from '#tests/container-fixtures'
import {
  ADVISOR_ACTOR,
  ENROLLMENT_IDS,
  OTHER_ADVISOR_ACTOR,
  enrollmentWorld,
  seedWorldClassroom,
} from '#tests/enrollments-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

const KEY = { classroomId: ENROLLMENT_IDS.classroom, sportId: ENROLLMENT_IDS.sport }

async function setup() {
  const world = enrollmentWorld()
  await seedWorldClassroom(world.classrooms)
  const useCase = await makeWithMemory(AdvisorEnrollmentUpdateUseCase, [
    [ClassroomRepository, world.classrooms],
    [EnrollmentRepository, world.enrollments],
    [EnrollmentRemovalRepository, world.removals],
    [UnitOfWork, world.unitOfWork],
  ])

  return { ...world, useCase }
}

test.group('advisor/enrollments > update (unit)', () => {
  test('grava a lista nova e devolve a matriz', async ({ assert }) => {
    const { useCase } = await setup()

    const board = rightOf(
      await useCase.execute({
        ...KEY,
        studentIds: [ENROLLMENT_IDS.ana, ENROLLMENT_IDS.bia],
        actor: ADVISOR_ACTOR,
      }),
    )

    assert.deepEqual(
      board.students.map((student) => student.sportIds.length),
      [1, 1],
    )
  })

  test('tirar atleta sem motivo é 422 ENROLLMENT_REASON_REQUIRED e nada grava', async ({
    assert,
  }) => {
    const { enrollments, useCase } = await setup()
    enrollments.withList(KEY, [ENROLLMENT_IDS.ana])

    const result = await useCase.execute({ ...KEY, studentIds: [], actor: ADVISOR_ACTOR })

    assert.deepInclude(result.value, { status: 422, code: 'ENROLLMENT_REASON_REQUIRED' })
    const stored = await enrollments.findForUpdate(KEY)
    assert.deepEqual(stored.snapshot().studentIds, [ENROLLMENT_IDS.ana])
  })

  test('tirar atleta com motivo grava a lista e o aviso para a organização', async ({ assert }) => {
    const { enrollments, removals, useCase } = await setup()
    enrollments.withList(KEY, [ENROLLMENT_IDS.ana])
    const notices: EnrollmentRemoval[] = []
    removals.saveAll = async (list) => {
      notices.push(...list)
    }

    rightOf(
      await useCase.execute({
        ...KEY,
        studentIds: [],
        reason: 'Mudou de turno',
        actor: ADVISOR_ACTOR,
      }),
    )

    const stored = await enrollments.findForUpdate(KEY)
    assert.deepEqual(stored.snapshot().studentIds, [])
    assert.lengthOf(notices, 1)
    assert.deepInclude(notices[0]?.snapshot(), { studentName: 'Ana', reason: 'Mudou de turno' })
  })

  test('acima do máximo da modalidade é 422 ENROLLMENT_LIMIT_EXCEEDED', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      ...KEY,
      studentIds: [ENROLLMENT_IDS.ana, ENROLLMENT_IDS.bia, ENROLLMENT_IDS.ana],
      actor: ADVISOR_ACTOR,
    })

    assert.deepInclude(result.value, { status: 422, code: 'ENROLLMENT_LIMIT_EXCEEDED' })
  })

  test('modalidade inexistente é 422 SPORT_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      classroomId: ENROLLMENT_IDS.classroom,
      sportId: '00000000-0000-4000-8000-000000000000',
      studentIds: [],
      actor: ADVISOR_ACTOR,
    })

    assert.deepInclude(result.value, { status: 422, code: 'SPORT_NOT_FOUND' })
  })

  test('turma de outro conselheiro é 404 CLASSROOM_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      ...KEY,
      studentIds: [ENROLLMENT_IDS.ana],
      actor: OTHER_ADVISOR_ACTOR,
    })

    assert.deepInclude(result.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
  })

  test('falha do repositório é 500 ADVISOR_ENROLLMENT_UPDATE_ERROR', async ({ assert }) => {
    const { enrollments, useCase } = await setup()
    enrollments.findSport = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({ ...KEY, studentIds: [], actor: ADVISOR_ACTOR })

    assert.deepInclude(result.value, { status: 500, code: 'ADVISOR_ENROLLMENT_UPDATE_ERROR' })
  })
})
