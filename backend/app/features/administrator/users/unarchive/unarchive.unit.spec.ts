import { test } from '@japa/runner'

import AdministratorUserUnarchiveUseCase from './unarchive.use-case.ts'

import { UserRepository } from '#repositories/user/user.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { identityDoubles, seedUser, USER_ID } from '#tests/identity-unit-fixtures'

async function setup() {
  const doubles = identityDoubles()
  const useCase = await makeWithMemory(AdministratorUserUnarchiveUseCase, [
    [UserRepository, doubles.users],
  ])

  return { ...doubles, useCase }
}

test.group('administrator/users > unarchive (unit)', () => {
  test('tira a conta da lixeira', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users, { archived: true })

    const result = await useCase.execute({ id: USER_ID })

    assert.isTrue(result.isRight())
    assert.isNotNull(await users.findById(USER_ID))
  })

  test('conta viva ou inexistente é 404 USER_NOT_FOUND', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)

    const alive = await useCase.execute({ id: USER_ID })
    const missing = await useCase.execute({ id: '0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f' })

    assert.deepInclude(alive.value, { status: 404, code: 'USER_NOT_FOUND' })
    assert.deepInclude(missing.value, { status: 404, code: 'USER_NOT_FOUND' })
  })

  test('falha do repositório é 500 USER_UNARCHIVE_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users, { archived: true })
    users.save = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({ id: USER_ID })

    assert.deepInclude(result.value, { status: 500, code: 'USER_UNARCHIVE_ERROR' })
  })
})
