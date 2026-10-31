import { test } from '@japa/runner'

import AdministratorClassroomPaginateUseCase from './paginate.use-case.ts'

import { Classroom } from '#domain/classroom/classroom.entity'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const classrooms = MemoryRepositories.classrooms()
  const grades = [
    ['9º A', 9],
    ['4º A', 4],
    ['9º B', 9],
  ] as const
  for (const [index, [name, grade]] of grades.entries()) {
    const created = Classroom.create(
      { id: `00000000-0000-4000-8000-00000000000${index}`, name, grade, now: new Date() },
      {},
    )
    if (created.isLeft()) throw new Error('invalid arrangement')
    await classrooms.save(created.value)
  }
  const useCase = await makeWithMemory(AdministratorClassroomPaginateUseCase, [
    [ClassroomRepository, classrooms],
  ])

  return { useCase }
}

test.group('administrator/classrooms > paginate (unit)', () => {
  test('without ?sort the list comes out by name, with meta and the card totals', async ({
    assert,
  }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({})

    assert.deepEqual(result.isRight() && result.value.data.map((item) => item.name), [
      '4º A',
      '9º A',
      '9º B',
    ])
    assert.equal(result.isRight() && result.value.meta.perPage, 20)
    if (result.isLeft()) throw new Error('list refused')
    assert.deepInclude(result.value.data[0] ?? {}, {
      studentsCount: 0,
      athletesCount: 0,
      sportsCount: 0,
    })
  })

  test('?category, ?search, ?sort e ?direction', async ({ assert }) => {
    const { useCase } = await setup()

    const f2 = await useCase.execute({ category: 'F2', sort: 'name', direction: 'desc' })
    const searched = await useCase.execute({ search: '4º' })

    assert.deepEqual(f2.isRight() && f2.value.data.map((item) => item.name), ['9º B', '9º A'])
    assert.equal(searched.isRight() && searched.value.meta.total, 1)
  })
})
