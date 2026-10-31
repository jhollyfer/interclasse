import { test } from '@japa/runner'

import AuthenticationSessionSignInUseCase from './sign-in.use-case.ts'

import { UserRepository } from '#repositories/user/user.repository'
import { SessionRepository } from '#repositories/session/session.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { identityDoubles, PASSWORD, seedUser, USER_ID } from '#tests/identity-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const doubles = identityDoubles()
  const useCase = await makeWithMemory(AuthenticationSessionSignInUseCase, [
    [UserRepository, doubles.users],
    [SessionRepository, doubles.sessions],
  ])

  return { ...doubles, useCase }
}

test.group('authentication/sessions > sign-in (unit)', () => {
  test('correct credential issues the token pair', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    const tokens = rightOf(await useCase.execute({ email: 'ana@mail.com', password: PASSWORD }))

    assert.isString(tokens.accessToken)
    assert.deepEqual(sessions.issued, [USER_ID])
  })

  test('wrong password, unknown email, archived and inactive account give the same 401', async ({
    assert,
  }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users, { id: USER_ID, email: 'ana@mail.com' })
    await seedUser(users, {
      id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
      email: 'arq@mail.com',
      archived: true,
    })
    await seedUser(users, {
      id: '3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f',
      email: 'off@mail.com',
      inactive: true,
    })

    const results = [
      await useCase.execute({ email: 'ana@mail.com', password: 'Errada@123' }),
      await useCase.execute({ email: 'ninguem@mail.com', password: PASSWORD }),
      await useCase.execute({ email: 'arq@mail.com', password: PASSWORD }),
      await useCase.execute({ email: 'off@mail.com', password: PASSWORD }),
    ]

    for (const result of results) {
      assert.deepInclude(result.value, { status: 401, code: 'INVALID_CREDENTIALS' })
      assert.deepEqual(result.value, results[0]?.value)
    }
    assert.deepEqual(sessions.issued, [])
  })

  test('repository failure is 500 AUTHENTICATION_SESSION_SIGN_IN_ERROR, not 401', async ({
    assert,
  }) => {
    const { users, useCase } = await setup()
    users.findByEmail = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({ email: 'ana@mail.com', password: PASSWORD })

    assert.deepInclude(result.value, { status: 500, code: 'AUTHENTICATION_SESSION_SIGN_IN_ERROR' })
  })
})
