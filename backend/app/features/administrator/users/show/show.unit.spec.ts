import { test } from '@japa/runner'

import AdministratorUserShowUseCase from './show.use-case.ts'

import { UserRepository } from '#repositories/user/user.repository'
import { makeWithMemory } from '#tests/unit-fixtures'
import { identityDoubles, seedUser, USER_ID } from '#tests/identity-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const doubles = identityDoubles()
  const useCase = await makeWithMemory(AdministratorUserShowUseCase, [
    [UserRepository, doubles.users],
  ])

  return { ...doubles, useCase }
}

test.group('administrator/users > show (unit)', () => {
  test('devolve a conta sem a senha', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)

    const user = rightOf(await useCase.execute({ id: USER_ID }))

    assert.deepInclude(user, { id: USER_ID, name: 'Ana' })
    assert.notProperty(user, 'password')
  })

  test('conta inexistente ou arquivada é 404 USER_NOT_FOUND', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users, { archived: true })

    const archived = await useCase.execute({ id: USER_ID })
    const missing = await useCase.execute({ id: '0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f' })

    assert.deepInclude(archived.value, { status: 404, code: 'USER_NOT_FOUND' })
    assert.deepInclude(missing.value, { status: 404, code: 'USER_NOT_FOUND' })
  })

  test('falha do repositório é 500 USER_SHOW_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    users.detail = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({ id: USER_ID })

    assert.deepInclude(result.value, { status: 500, code: 'USER_SHOW_ERROR' })
  })
})
