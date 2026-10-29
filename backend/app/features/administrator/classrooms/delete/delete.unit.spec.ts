import { test } from '@japa/runner'

import AdministratorClassroomDeleteUseCase from './delete.use-case.ts'

import { Classroom } from '#domain/classroom/classroom.entity'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { ClassroomMemoryRepository } from '#repositories/classroom/classroom.memory.repository'
import { makeWithMemory } from '#tests/unit-fixtures'

const ID = '9b8a7f6e-5d4c-4b3a-8f2e-1d0c9b8a7f6e'

async function setup() {
  const classrooms = new ClassroomMemoryRepository()
  const created = Classroom.create({ id: ID, name: '7º A', grade: 7, now: new Date() }, {})
  if (created.isLeft()) throw new Error('arranjo inválido')
  await classrooms.save(created.value)
  const useCase = await makeWithMemory(AdministratorClassroomDeleteUseCase, [
    [ClassroomRepository, classrooms],
  ])

  return { classrooms, useCase }
}

test.group('administrator/classrooms > delete (unit)', () => {
  test('apaga a turma fora de qualquer chave', async ({ assert }) => {
    const { classrooms, useCase } = await setup()

    const result = await useCase.execute({ id: ID })

    assert.isTrue(result.isRight())
    assert.isNull(await classrooms.findById(ID))
  })

  test('numa chave sorteada é 409 CLASSROOM_IN_COMPETITION e fica', async ({ assert }) => {
    const { classrooms, useCase } = await setup()
    classrooms.markInCompetition(ID)

    const result = await useCase.execute({ id: ID })

    assert.deepInclude(result.value, { status: 409, code: 'CLASSROOM_IN_COMPETITION' })
    assert.isNotNull(await classrooms.findById(ID))
  })

  test('inexistente é 404', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000' })

    assert.deepInclude(result.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
  })
})
