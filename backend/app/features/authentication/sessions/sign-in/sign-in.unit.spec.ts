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
  test('credencial correta emite o par de tokens', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    const tokens = rightOf(await useCase.execute({ email: 'ana@mail.com', password: PASSWORD }))

    assert.isString(tokens.accessToken)
    assert.deepEqual(sessions.issued, [USER_ID])
  })

  test('senha errada, e-mail desconhecido, conta arquivada e inativa dão o mesmo 401', async ({
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

  test('falha do repositório é 500 SESSION_SIGN_IN_ERROR, e não 401', async ({ assert }) => {
    const { users, useCase } = await setup()
    users.findByEmail = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({ email: 'ana@mail.com', password: PASSWORD })

    assert.deepInclude(result.value, { status: 500, code: 'SESSION_SIGN_IN_ERROR' })
  })
})
