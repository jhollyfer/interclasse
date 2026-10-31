import { test } from '@japa/runner'
import { USER_ROLE } from '@interclasse/shared'

import AdvisorClassroomPaginateUseCase from './paginate.use-case.ts'

import { Classroom } from '#domain/classroom/classroom.entity'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

const ADVISOR = '11111111-1111-4111-8111-111111111111'
const FREE = { advisor: { exists: true, taken: false } }

async function setup() {
  const classrooms = MemoryRepositories.classrooms()
  const own = Classroom.create(
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: '9º A',
      grade: 9,
      advisorId: ADVISOR,
      now: new Date(),
    },
    FREE,
  )
  const foreign = Classroom.create(
    { id: '00000000-0000-4000-8000-000000000002', name: '8º A', grade: 8, now: new Date() },
    {},
  )
  if (own.isLeft() || foreign.isLeft()) throw new Error('invalid arrangement')
  await classrooms.save(own.value)
  await classrooms.save(foreign.value)
  const useCase = await makeWithMemory(AdvisorClassroomPaginateUseCase, [
    [ClassroomRepository, classrooms],
  ])

  return { useCase }
}

test.group('advisor/classrooms > paginate (unit)', () => {
  test('the advisor sees only the classroom they advise', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      actor: { id: ADVISOR, role: USER_ROLE.ADVISOR, avatarId: null },
    })

    assert.deepEqual(result.isRight() && result.value.data.map((item) => item.name), ['9º A'])
  })

  test('the administrator sees all of them, by name, and the search narrows', async ({
    assert,
  }) => {
    const { useCase } = await setup()
    const actor = { id: ADVISOR, role: USER_ROLE.ADMINISTRATOR, avatarId: null }

    const all = await useCase.execute({ actor })
    const searched = await useCase.execute({ actor, search: '8º' })

    assert.deepEqual(all.isRight() && all.value.data.map((item) => item.name), ['8º A', '9º A'])
    assert.equal(searched.isRight() && searched.value.meta.total, 1)
  })

  test('account without a link sees nothing', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      actor: {
        id: '99999999-9999-4999-8999-999999999999',
        role: USER_ROLE.REPRESENTATIVE,
        avatarId: null,
      },
    })

    assert.equal(result.isRight() && result.value.meta.total, 0)
  })
})
