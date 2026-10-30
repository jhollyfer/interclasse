import { test } from '@japa/runner'
import { USER_ROLE } from '@interclasse/shared'

import AdvisorStudentPaginateUseCase from './paginate.use-case.ts'

import { Student } from '#domain/student/student.entity'
import { StudentRepository } from '#repositories/student/student.repository'
import { StudentMemoryRepository } from '#repositories/student/student.memory.repository'
import { makeWithMemory } from '#tests/container-fixtures'

const ADVISOR = '11111111-1111-4111-8111-111111111111'
const OWN = '00000000-0000-4000-8000-000000000001'
const FOREIGN = '00000000-0000-4000-8000-000000000002'
const ACTOR = { id: ADVISOR, role: USER_ROLE.ADVISOR, avatarId: null }

async function setup() {
  const students = new StudentMemoryRepository()
    .withClassroom(OWN, ADVISOR)
    .withClassroom(FOREIGN, null)
  const names = [
    ['00000000-0000-4000-8000-00000000000a', OWN, 'Bia'],
    ['00000000-0000-4000-8000-00000000000b', OWN, 'Ana'],
    ['00000000-0000-4000-8000-00000000000c', FOREIGN, 'Caio'],
  ] as const
  for (const [id, classroomId, name] of names) {
    const created = Student.create({ id, classroomId, name, now: new Date() })
    if (created.isLeft()) throw new Error('arranjo inválido')
    await students.save(created.value)
  }
  const useCase = await makeWithMemory(AdvisorStudentPaginateUseCase, [
    [StudentRepository, students],
  ])

  return { useCase }
}

test.group('advisor/students > paginate (unit)', () => {
  test('lista só os alunos do conselheiro, em ordem alfabética, com meta', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ actor: ACTOR })

    assert.deepEqual(result.isRight() && result.value.data.map((item) => item.name), ['Ana', 'Bia'])
    assert.equal(result.isRight() && result.value.meta.perPage, 20)
  })

  test('turma de outro conselheiro responde vazio, sem confirmar que existe', async ({
    assert,
  }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ actor: ACTOR, classroomId: FOREIGN })

    assert.equal(result.isRight() && result.value.meta.total, 0)
  })

  test('o administrador vê todos, e a busca recorta', async ({ assert }) => {
    const { useCase } = await setup()
    const actor = { id: ADVISOR, role: USER_ROLE.ADMINISTRATOR, avatarId: null }

    const all = await useCase.execute({ actor })
    const searched = await useCase.execute({ actor, search: 'cai' })

    assert.equal(all.isRight() && all.value.meta.total, 3)
    assert.equal(searched.isRight() && searched.value.meta.total, 1)
  })
})
