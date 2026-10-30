import { test } from '@japa/runner'
import { USER_ROLE } from '@interclasse/shared'

import AdvisorStudentCreateUseCase from './create.use-case.ts'

import { Classroom } from '#domain/classroom/classroom.entity'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { StudentRepository } from '#repositories/student/student.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

const ADVISOR = '11111111-1111-4111-8111-111111111111'
const CLASSROOM = '00000000-0000-4000-8000-000000000001'
const FOREIGN = '00000000-0000-4000-8000-000000000002'
const OWNER = { id: ADVISOR, role: USER_ROLE.ADVISOR, avatarId: null }

async function setup() {
  const classrooms = MemoryRepositories.classrooms()
  const own = Classroom.create(
    { id: CLASSROOM, name: '9º A', grade: 9, advisorId: ADVISOR, now: new Date() },
    { advisor: { exists: true, taken: false } },
  )
  const foreign = Classroom.create({ id: FOREIGN, name: '8º A', grade: 8, now: new Date() }, {})
  if (own.isLeft() || foreign.isLeft()) throw new Error('arranjo inválido')
  await classrooms.save(own.value)
  await classrooms.save(foreign.value)
  const students = MemoryRepositories.students().withClassroom(CLASSROOM, ADVISOR)
  const useCase = await makeWithMemory(AdvisorStudentCreateUseCase, [
    [ClassroomRepository, classrooms],
    [StudentRepository, students],
  ])

  return { students, useCase }
}

test.group('advisor/students > create (unit)', () => {
  test('cadastra o aluno na turma do conselheiro', async ({ assert }) => {
    const { students, useCase } = await setup()

    const result = await useCase.execute({ classroomId: CLASSROOM, name: ' Ana ', actor: OWNER })

    assert.isTrue(result.isRight())
    assert.deepInclude(result.value, { classroomId: CLASSROOM, name: 'Ana' })
    const listed = await students.paginate({ page: 1, perPage: 10, actor: OWNER })
    assert.equal(listed.meta.total, 1)
  })

  test('turma de outro conselheiro é 404 CLASSROOM_NOT_FOUND e nada é gravado', async ({
    assert,
  }) => {
    const { students, useCase } = await setup()

    const result = await useCase.execute({ classroomId: FOREIGN, name: 'Ana', actor: OWNER })

    assert.deepInclude(result.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
    const listed = await students.paginate({
      page: 1,
      perPage: 10,
      actor: { id: ADVISOR, role: USER_ROLE.ADMINISTRATOR, avatarId: null },
    })
    assert.equal(listed.meta.total, 0)
  })

  test('o administrador cadastra em qualquer turma', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      classroomId: FOREIGN,
      name: 'Ana',
      actor: { id: ADVISOR, role: USER_ROLE.ADMINISTRATOR, avatarId: null },
    })

    assert.isTrue(result.isRight())
  })

  test('nome em branco é 422 STUDENT_NAME_EMPTY', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ classroomId: CLASSROOM, name: '   ', actor: OWNER })

    assert.deepInclude(result.value, { status: 422, code: 'STUDENT_NAME_EMPTY' })
  })
})
