import { test } from '@japa/runner'
import { USER_ROLE } from '@interclasse/shared'

import AdministratorEnrollmentRemovalPaginateUseCase from './paginate.use-case.ts'

import { EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { memoryRemovals, seedRemoval } from '#tests/enrollment-removals-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const removals = memoryRemovals()
  const useCase = await makeWithMemory(AdministratorEnrollmentRemovalPaginateUseCase, [
    [EnrollmentRemovalRepository, removals],
  ])

  return { removals, useCase }
}

test.group('administrator/enrollment-removals > paginate (unit)', () => {
  test('lista os pendentes antes dos lidos', async ({ assert }) => {
    const { removals, useCase } = await setup()
    const read = await seedRemoval(removals, { role: USER_ROLE.ADMINISTRATOR })
    const pending = await seedRemoval(removals, { at: new Date('2026-10-28T12:00:00.000Z') })

    const page = rightOf(await useCase.execute({}))

    assert.deepEqual(
      page.data.map((item) => item.id),
      [pending, read],
    )
  })

  test('pending filtra só os pendentes', async ({ assert }) => {
    const { removals, useCase } = await setup()
    await seedRemoval(removals, { role: USER_ROLE.ADMINISTRATOR })
    const pending = await seedRemoval(removals)

    const page = rightOf(await useCase.execute({ pending: true }))

    assert.deepEqual(
      page.data.map((item) => item.id),
      [pending],
    )
  })

  test('falha do repositório é 500 ADMINISTRATOR_ENROLLMENT_REMOVAL_PAGINATE_ERROR', async ({
    assert,
  }) => {
    const { removals, useCase } = await setup()
    removals.paginate = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({})

    assert.deepInclude(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_ENROLLMENT_REMOVAL_PAGINATE_ERROR',
    })
  })
})
