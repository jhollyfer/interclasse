import { test } from '@japa/runner'
import { USER_ROLE, type UserRole } from '@interclasse/shared'

import AdministratorClassroomCreateUseCase from './create.use-case.ts'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

const ADVISOR = '11111111-1111-4111-8111-111111111111'
const REPRESENTATIVE = '22222222-2222-4222-8222-222222222222'

function account(id: string, role: UserRole) {
  return {
    id,
    name: 'Conta',
    email: `${id}@mail.com`,
    role,
    status: 'ACTIVE',
    avatarId: null,
    createdAt: '2026-10-29T12:00:00.000Z',
    updatedAt: null,
    deletedAt: null,
  } as const
}

async function setup() {
  const classrooms = MemoryRepositories.classrooms()
    .withAccount(account(ADVISOR, USER_ROLE.ADVISOR))
    .withAccount(account(REPRESENTATIVE, USER_ROLE.REPRESENTATIVE))
  const useCase = await makeWithMemory(AdministratorClassroomCreateUseCase, [
    [ClassroomRepository, classrooms],
  ])

  return { classrooms, useCase }
}

test.group('administrator/classrooms > create (unit)', () => {
  test('cadastra com a categoria derivada do ano', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ name: '4º A', grade: 4 })

    assert.isTrue(result.isRight())
    assert.deepInclude(result.value, { name: '4º A', grade: 4, category: 'F1' })
  })

  test('devolve conselheiro e representante aninhados', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      name: '9º A',
      grade: 9,
      advisorId: ADVISOR,
      representativeId: REPRESENTATIVE,
    })

    assert.isTrue(result.isRight())
    assert.equal(result.isRight() && result.value.advisor?.id, ADVISOR)
    assert.equal(result.isRight() && result.value.representative?.id, REPRESENTATIVE)
  })

  test('nome repetido é 409 CLASSROOM_ALREADY_EXISTS', async ({ assert }) => {
    const { useCase } = await setup()
    await useCase.execute({ name: '4º A', grade: 4 })

    const result = await useCase.execute({ name: '4º A', grade: 5 })

    assert.deepInclude(result.value, { status: 409, code: 'CLASSROOM_ALREADY_EXISTS' })
  })

  test('conta que não existe é 422 ADVISOR_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      name: '4º A',
      grade: 4,
      advisorId: '33333333-3333-4333-8333-333333333333',
    })

    assert.deepInclude(result.value, { status: 422, code: 'ADVISOR_NOT_FOUND' })
  })

  test('representante indicado como conselheiro é 422 ADVISOR_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ name: '4º A', grade: 4, advisorId: REPRESENTATIVE })

    assert.deepInclude(result.value, { status: 422, code: 'ADVISOR_NOT_FOUND' })
  })

  test('conselheiro de outra turma é 409 ADVISOR_TAKEN', async ({ assert }) => {
    const { useCase } = await setup()
    await useCase.execute({ name: '4º A', grade: 4, advisorId: ADVISOR })

    const result = await useCase.execute({ name: '5º A', grade: 5, advisorId: ADVISOR })

    assert.deepInclude(result.value, { status: 409, code: 'ADVISOR_TAKEN' })
  })

  test('representante de outra turma é 409 REPRESENTATIVE_TAKEN', async ({ assert }) => {
    const { useCase } = await setup()
    await useCase.execute({ name: '4º A', grade: 4, representativeId: REPRESENTATIVE })

    const result = await useCase.execute({
      name: '5º A',
      grade: 5,
      representativeId: REPRESENTATIVE,
    })

    assert.deepInclude(result.value, { status: 409, code: 'REPRESENTATIVE_TAKEN' })
  })

  test('ano fora do 3º ao 9º é 422 CLASSROOM_INVALID_GRADE', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ name: '1º A', grade: 1 })

    assert.deepInclude(result.value, { status: 422, code: 'CLASSROOM_INVALID_GRADE' })
  })
})
