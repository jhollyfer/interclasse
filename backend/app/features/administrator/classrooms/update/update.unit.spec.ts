import { test } from '@japa/runner'
import { USER_ROLE, type UserRole } from '@interclasse/shared'

import AdministratorClassroomUpdateUseCase from './update.use-case.ts'

import { Classroom } from '#domain/classroom/classroom.entity'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { ClassroomMemoryRepository } from '#repositories/classroom/classroom.memory.repository'
import { makeWithMemory } from '#tests/container-fixtures'

const ID = '6a4f2e1d-0c9b-4a8f-8e7d-6c5b4a3f2e1d'
const OTHER = '7b5a3f2e-1d0c-4b9a-9f8e-7d6c5b4a3f2e'
const ADVISOR = '11111111-1111-4111-8111-111111111111'
const SECOND_ADVISOR = '44444444-4444-4444-8444-444444444444'

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

async function born(
  classrooms: ClassroomMemoryRepository,
  id: string,
  name: string,
  grade: number,
  advisorId?: string,
) {
  const created = Classroom.create(
    { id, name, grade, advisorId, now: new Date() },
    {
      advisor: { exists: true, taken: false },
    },
  )
  if (created.isLeft()) throw new Error('arranjo inválido')
  await classrooms.save(created.value)
}

async function setup() {
  const classrooms = new ClassroomMemoryRepository()
    .withAccount(account(ADVISOR, USER_ROLE.ADVISOR))
    .withAccount(account(SECOND_ADVISOR, USER_ROLE.ADVISOR))
  await born(classrooms, ID, '7º A', 7, ADVISOR)
  const useCase = await makeWithMemory(AdministratorClassroomUpdateUseCase, [
    [ClassroomRepository, classrooms],
  ])

  return { classrooms, useCase }
}

test.group('administrator/classrooms > update (unit)', () => {
  test('turma inexistente é 404', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000', name: 'X' })

    assert.deepInclude(result.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
  })

  test('renomeia e devolve a turma com os vínculos', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: ID, name: '7º B' })

    assert.deepInclude(result.value, { name: '7º B', grade: 7, advisorId: ADVISOR })
  })

  test('manter o próprio nome não é conflito', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: ID, name: '7º A', grade: 8 })

    assert.isTrue(result.isRight())
  })

  test('nome de outra turma é 409 CLASSROOM_ALREADY_EXISTS', async ({ assert }) => {
    const { classrooms, useCase } = await setup()
    await born(classrooms, OTHER, '8º A', 8)

    const result = await useCase.execute({ id: ID, name: '8º A' })

    assert.deepInclude(result.value, { status: 409, code: 'CLASSROOM_ALREADY_EXISTS' })
  })

  test('mudar o ano recalcula a categoria', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: ID, grade: 4 })

    assert.deepInclude(result.value, { grade: 4, category: 'F1' })
  })

  test('turma sorteada não muda de categoria: 409 CLASSROOM_IN_COMPETITION no campo grade', async ({
    assert,
  }) => {
    const { classrooms, useCase } = await setup()
    classrooms.markInCompetition(ID)

    const result = await useCase.execute({ id: ID, grade: 4 })

    assert.deepInclude(result.value, { status: 409, code: 'CLASSROOM_IN_COMPETITION' })
    assert.isTrue(result.isLeft() && Boolean(result.value.errors?.grade))
  })

  test('turma sorteada muda de ano dentro da categoria', async ({ assert }) => {
    const { classrooms, useCase } = await setup()
    classrooms.markInCompetition(ID)

    const result = await useCase.execute({ id: ID, grade: 9 })

    assert.isTrue(result.isRight())
  })

  test('conselheiro de outra turma é 409 ADVISOR_TAKEN', async ({ assert }) => {
    const { classrooms, useCase } = await setup()
    await born(classrooms, OTHER, '8º A', 8, SECOND_ADVISOR)

    const result = await useCase.execute({ id: ID, advisorId: SECOND_ADVISOR })

    assert.deepInclude(result.value, { status: 409, code: 'ADVISOR_TAKEN' })
  })

  test('repetir o conselheiro atual não é conflito, e null desfaz o vínculo', async ({
    assert,
  }) => {
    const { useCase } = await setup()

    const kept = await useCase.execute({ id: ID, advisorId: ADVISOR })
    const unlinked = await useCase.execute({ id: ID, advisorId: null })

    assert.isTrue(kept.isRight())
    assert.deepInclude(unlinked.value, { advisorId: null, advisor: null })
  })
})
