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
  test('a matriz da turma que ele representa', async ({ assert }) => {
    const { useCase } = await setup()

    const board = rightOf(await useCase.execute({ actor: REPRESENTATIVE_ACTOR }))

    assert.equal(board.classroom.id, ENROLLMENT_IDS.classroom)
    assert.lengthOf(board.students, 2)
  })

  test('modalidade já sorteada vem travada para o representante', async ({ assert }) => {
    const { enrollments, useCase } = await setup()
    enrollments.markDrawn('F2', ENROLLMENT_IDS.sport)

    const board = rightOf(await useCase.execute({ actor: REPRESENTATIVE_ACTOR }))

    assert.isTrue(board.sports[0]?.locked)
  })

  test('sem turma vinculada é 404 CLASSROOM_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      actor: { ...REPRESENTATIVE_ACTOR, id: ENROLLMENT_IDS.otherAdvisor },
    })

    assert.deepInclude(result.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
  })

  test('falha do repositório é 500 REPRESENTATIVE_ENROLLMENT_SHOW_ERROR', async ({ assert }) => {
    const { enrollments, useCase } = await setup()
    enrollments.board = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({ actor: REPRESENTATIVE_ACTOR })

    assert.deepInclude(result.value, {
      status: 500,
      code: 'REPRESENTATIVE_ENROLLMENT_SHOW_ERROR',
    })
  })
})
