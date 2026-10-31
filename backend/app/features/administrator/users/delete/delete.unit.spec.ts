import { test } from '@japa/runner'

import AdministratorUserDeleteUseCase from './delete.use-case.ts'

import { UserRepository } from '#repositories/user/user.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { identityDoubles, seedUser, USER_ID } from '#tests/identity-unit-fixtures'

async function setup() {
  const doubles = identityDoubles()
  const useCase = await makeWithMemory(AdministratorUserDeleteUseCase, [
    [UserRepository, doubles.users],
  ])

  return { ...doubles, useCase }
}

test.group('administrator/users > delete (unit)', () => {
  test('deletes the archived account for good', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users, { archived: true })

    const result = await useCase.execute({ id: USER_ID })

    assert.isTrue(result.isRight())
    assert.isNull(await users.findAnyById(USER_ID))
  })

  test('live account is 409 USER_NOT_ARCHIVED and stays', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)

    const result = await useCase.execute({ id: USER_ID })

    assert.deepInclude(result.value, { status: 409, code: 'USER_NOT_ARCHIVED' })
    assert.isNotNull(await users.findById(USER_ID))
  })

  test('nonexistent account is 404 USER_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: USER_ID })

    assert.deepInclude(result.value, { status: 404, code: 'USER_NOT_FOUND' })
  })

  test('repository failure is 500 ADMINISTRATOR_USER_DELETE_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users, { archived: true })
    users.delete = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({ id: USER_ID })

    assert.deepInclude(result.value, { status: 500, code: 'ADMINISTRATOR_USER_DELETE_ERROR' })
  })
})
