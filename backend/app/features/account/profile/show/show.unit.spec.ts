import { test } from '@japa/runner'

import AccountProfileShowUseCase from './show.use-case.ts'

import { UserRepository } from '#repositories/user/user.repository'
import { makeWithMemory } from '#tests/unit-fixtures'
import { identityDoubles, seedUser, USER_ID } from '#tests/identity-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const doubles = identityDoubles()
  const useCase = await makeWithMemory(AccountProfileShowUseCase, [[UserRepository, doubles.users]])

  return { ...doubles, useCase }
}

test.group('account/profile > show (unit)', () => {
  test('devolve a própria conta, sem a senha', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)

    const profile = rightOf(
      await useCase.execute({ actor: { id: USER_ID, role: 'ADVISOR', avatarId: null } }),
    )

    assert.deepInclude(profile, { id: USER_ID, email: 'ana@mail.com' })
    assert.notProperty(profile, 'password')
  })

  test('falha do repositório é 500 PROFILE_SHOW_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    users.detail = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({
      actor: { id: USER_ID, role: 'ADVISOR', avatarId: null },
    })

    assert.deepInclude(result.value, { status: 500, code: 'PROFILE_SHOW_ERROR' })
  })
})
