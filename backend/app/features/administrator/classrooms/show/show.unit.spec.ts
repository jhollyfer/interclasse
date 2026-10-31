import { test } from '@japa/runner'

import AdministratorClassroomShowUseCase from './show.use-case.ts'

import { Classroom } from '#domain/classroom/classroom.entity'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

const ID = '9b8a7f6e-5d4c-4b3a-8f2e-1d0c9b8a7f6e'

async function setup() {
  const classrooms = MemoryRepositories.classrooms()
  const created = Classroom.create({ id: ID, name: '7º A', grade: 7, now: new Date() }, {})
  if (created.isLeft()) throw new Error('invalid arrangement')
  await classrooms.save(created.value)
  const useCase = await makeWithMemory(AdministratorClassroomShowUseCase, [
    [ClassroomRepository, classrooms],
  ])

  return { useCase }
}

test.group('administrator/classrooms > show (unit)', () => {
  test('returns the classroom in the response shape', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: ID })

    assert.deepInclude(result.value, {
      id: ID,
      name: '7º A',
      category: 'F2',
      advisor: null,
      representative: null,
    })
  })

  test('nonexistent is 404 CLASSROOM_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000' })

    assert.deepInclude(result.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
  })
})
