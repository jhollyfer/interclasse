import { test } from '@japa/runner'

import AuthenticationSessionRefreshUseCase from './refresh.use-case.ts'

import { UserRepository } from '#repositories/user/user.repository'
import { SessionRepository } from '#repositories/session/session.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { identityDoubles, seedUser, USER_ID } from '#tests/identity-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

const GRANT = { userId: USER_ID, identifier: '7' }

async function setup() {
  const doubles = identityDoubles()
  doubles.sessions.withRefresh('refresh-ok', GRANT)
  const useCase = await makeWithMemory(AuthenticationSessionRefreshUseCase, [
    [UserRepository, doubles.users],
    [SessionRepository, doubles.sessions],
  ])

  return { ...doubles, useCase }
}

test.group('authentication/sessions > refresh (unit)', () => {
  test('rotates: spends the refresh and issues the new pair', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    const tokens = rightOf(await useCase.execute({ refreshToken: 'refresh-ok' }))

    assert.isString(tokens.refreshToken)
    assert.deepEqual(sessions.issued, [USER_ID])
  })

  test('using the same refresh twice drops the second: 401 REFRESH_TOKEN_INVALID', async ({
    assert,
  }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    await useCase.execute({ refreshToken: 'refresh-ok' })

    const second = await useCase.execute({ refreshToken: 'refresh-ok' })

    assert.deepInclude(second.value, { status: 401, code: 'REFRESH_TOKEN_INVALID' })
  })

  test('without a cookie is 401 REFRESH_TOKEN_MISSING', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({})

    assert.deepInclude(result.value, { status: 401, code: 'REFRESH_TOKEN_MISSING' })
  })

  test('unreadable or unknown token is 401 REFRESH_TOKEN_INVALID', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ refreshToken: 'lixo' })

    assert.deepInclude(result.value, { status: 401, code: 'REFRESH_TOKEN_INVALID' })
  })

  test('archived, inactive or deleted account does not refresh', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    const user = await seedUser(users, { inactive: true })

    const inactive = await useCase.execute({ refreshToken: 'refresh-ok' })
    await users.delete(user)
    const gone = await useCase.execute({ refreshToken: 'refresh-ok' })

    assert.deepInclude(inactive.value, { status: 401, code: 'REFRESH_TOKEN_INVALID' })
    assert.deepInclude(gone.value, { status: 401, code: 'REFRESH_TOKEN_INVALID' })
    assert.deepEqual(sessions.issued, [])
  })

  test('repository failure is 500 AUTHENTICATION_SESSION_REFRESH_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    users.findById = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({ refreshToken: 'refresh-ok' })

    assert.deepInclude(result.value, { status: 500, code: 'AUTHENTICATION_SESSION_REFRESH_ERROR' })
  })
})
