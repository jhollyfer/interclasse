import { test } from '@japa/runner'
import { USER_ROLE } from '@interclasse/shared'

import AdvisorStudentDeleteUseCase from './delete.use-case.ts'

import { Student } from '#domain/student/student.entity'
import { StudentRepository } from '#repositories/student/student.repository'
import { StudentMemoryRepository } from '#repositories/student/student.memory.repository'
import { makeWithMemory } from '#tests/container-fixtures'

const ADVISOR = '11111111-1111-4111-8111-111111111111'
const CLASSROOM = '00000000-0000-4000-8000-000000000001'
const ID = '6a4f2e1d-0c9b-4a8f-8e7d-6c5b4a3f2e1d'
const OWNER = { id: ADVISOR, role: USER_ROLE.ADVISOR, avatarId: null }

async function setup() {
  const students = new StudentMemoryRepository().withClassroom(CLASSROOM, ADVISOR)
  const ana = Student.create({ id: ID, classroomId: CLASSROOM, name: 'Ana', now: new Date() })
  if (ana.isLeft()) throw new Error('arranjo inválido')
  await students.save(ana.value)
  const useCase = await makeWithMemory(AdvisorStudentDeleteUseCase, [[StudentRepository, students]])

  return { students, useCase }
}

test.group('advisor/students > delete (unit)', () => {
  test('tira o aluno da turma', async ({ assert }) => {
    const { students, useCase } = await setup()

    const result = await useCase.execute({ id: ID, actor: OWNER })

    assert.isTrue(result.isRight())
    assert.isNull(await students.findOwned({ id: ID, actor: OWNER }))
  })

  test('inscrito em modalidade já sorteada é 409 STUDENT_IN_COMPETITION e fica', async ({
    assert,
  }) => {
    const { students, useCase } = await setup()
    students.markInDrawnSport(ID)

    const result = await useCase.execute({ id: ID, actor: OWNER })

    assert.deepInclude(result.value, { status: 409, code: 'STUDENT_IN_COMPETITION' })
    assert.isNotNull(await students.findOwned({ id: ID, actor: OWNER }))
  })

  test('aluno de turma alheia ou inexistente é 404 STUDENT_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const foreign = await useCase.execute({
      id: ID,
      actor: {
        id: '99999999-9999-4999-8999-999999999999',
        role: USER_ROLE.ADVISOR,
        avatarId: null,
      },
    })
    const missing = await useCase.execute({
      id: '00000000-0000-4000-8000-000000000000',
      actor: OWNER,
    })

    assert.deepInclude(foreign.value, { status: 404, code: 'STUDENT_NOT_FOUND' })
    assert.deepInclude(missing.value, { status: 404, code: 'STUDENT_NOT_FOUND' })
  })
})
