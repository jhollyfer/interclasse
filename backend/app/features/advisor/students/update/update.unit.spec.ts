import { test } from '@japa/runner'
import { USER_ROLE } from '@interclasse/shared'

import AdvisorStudentUpdateUseCase from './update.use-case.ts'

import { Student } from '#domain/student/student.entity'
import { StudentRepository } from '#repositories/student/student.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

const ADVISOR = '11111111-1111-4111-8111-111111111111'
const CLASSROOM = '00000000-0000-4000-8000-000000000001'
const ID = '6a4f2e1d-0c9b-4a8f-8e7d-6c5b4a3f2e1d'
const OWNER = { id: ADVISOR, role: USER_ROLE.ADVISOR, avatarId: null }

async function setup() {
  const students = MemoryRepositories.students().withClassroom(CLASSROOM, ADVISOR)
  const ana = Student.create({ id: ID, classroomId: CLASSROOM, name: 'Ana', now: new Date() })
  if (ana.isLeft()) throw new Error('invalid arrangement')
  await students.save(ana.value)
  const useCase = await makeWithMemory(AdvisorStudentUpdateUseCase, [[StudentRepository, students]])

  return { useCase }
}

test.group('advisor/students > update (unit)', () => {
  test('corrige o nome', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: ID, name: 'Ana Clara', actor: OWNER })

    assert.deepInclude(result.value, { id: ID, name: 'Ana Clara' })
  })

  test('student of a foreign classroom is 404 STUDENT_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      id: ID,
      name: 'Outro',
      actor: {
        id: '99999999-9999-4999-8999-999999999999',
        role: USER_ROLE.ADVISOR,
        avatarId: null,
      },
    })

    assert.deepInclude(result.value, { status: 404, code: 'STUDENT_NOT_FOUND' })
  })

  test('nonexistent student is 404, and the administrator reaches any one', async ({ assert }) => {
    const { useCase } = await setup()
    const administrator = { id: ADVISOR, role: USER_ROLE.ADMINISTRATOR, avatarId: null }

    const missing = await useCase.execute({
      id: '00000000-0000-4000-8000-000000000000',
      name: 'X',
      actor: administrator,
    })
    const found = await useCase.execute({ id: ID, name: 'Ana Maria', actor: administrator })

    assert.deepInclude(missing.value, { status: 404, code: 'STUDENT_NOT_FOUND' })
    assert.isTrue(found.isRight())
  })

  test('blank name is 422 STUDENT_NAME_EMPTY', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: ID, name: ' ', actor: OWNER })

    assert.deepInclude(result.value, { status: 422, code: 'STUDENT_NAME_EMPTY' })
  })
})
