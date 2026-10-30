import { test } from '@japa/runner'

import AdministratorEnrollmentRemovalAcknowledgeUseCase from './acknowledge.use-case.ts'

import { EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { memoryRemovals, seedRemoval } from '#tests/enrollment-removals-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const removals = memoryRemovals()
  const useCase = await makeWithMemory(AdministratorEnrollmentRemovalAcknowledgeUseCase, [
    [EnrollmentRemovalRepository, removals],
  ])

  return { removals, useCase }
}

test.group('administrator/enrollment-removals > acknowledge (unit)', () => {
  test('dá ciência ao aviso pendente e grava a data', async ({ assert }) => {
    const { removals, useCase } = await setup()
    const id = await seedRemoval(removals)

    const detail = rightOf(await useCase.execute({ id }))

    assert.isString(detail.acknowledgedAt)
    const stored = await removals.findById(id)
    assert.isNotNull(stored?.snapshot().acknowledgedAt)
  })

  test('repetir a ciência mantém a data da primeira', async ({ assert }) => {
    const { removals, useCase } = await setup()
    const id = await seedRemoval(removals)

    const first = rightOf(await useCase.execute({ id }))
    const second = rightOf(await useCase.execute({ id }))

    assert.equal(second.acknowledgedAt, first.acknowledgedAt)
  })

  test('aviso inexistente é 404 ENROLLMENT_REMOVAL_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000' })

    assert.deepInclude(result.value, { status: 404, code: 'ENROLLMENT_REMOVAL_NOT_FOUND' })
  })

  test('falha do repositório é 500 ADMINISTRATOR_ENROLLMENT_REMOVAL_ACKNOWLEDGE_ERROR', async ({
    assert,
  }) => {
    const { removals, useCase } = await setup()
    removals.findById = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000' })

    assert.deepInclude(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_ENROLLMENT_REMOVAL_ACKNOWLEDGE_ERROR',
    })
  })
})
