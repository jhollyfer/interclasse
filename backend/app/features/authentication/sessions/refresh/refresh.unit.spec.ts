import { test } from '@japa/runner'

import AuthenticationSessionRefreshUseCase from './refresh.use-case.ts'

import { UserRepository } from '#repositories/user/user.repository'
import { SessionContract } from '#services/session/session.contract'
import { makeWithMemory } from '#tests/container-fixtures'
import { identityDoubles, seedUser, USER_ID } from '#tests/identity-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

const GRANT = { userId: USER_ID, identifier: '7' }

async function setup() {
  const doubles = identityDoubles()
  doubles.sessions.withRefresh('refresh-ok', GRANT)
  const useCase = await makeWithMemory(AuthenticationSessionRefreshUseCase, [
    [UserRepository, doubles.users],
    [SessionContract, doubles.sessions],
  ])

  return { ...doubles, useCase }
}

test.group('authentication/sessions > refresh (unit)', () => {
  test('rotaciona: gasta o refresh e emite o par novo', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    const tokens = rightOf(await useCase.execute({ refreshToken: 'refresh-ok' }))

    assert.isString(tokens.refreshToken)
    assert.deepEqual(sessions.issued, [USER_ID])
  })

  test('usar o mesmo refresh duas vezes derruba a segunda: 401 REFRESH_TOKEN_INVALID', async ({
    assert,
  }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    await useCase.execute({ refreshToken: 'refresh-ok' })

    const second = await useCase.execute({ refreshToken: 'refresh-ok' })

    assert.deepInclude(second.value, { status: 401, code: 'REFRESH_TOKEN_INVALID' })
  })

  test('sem cookie é 401 REFRESH_TOKEN_MISSING', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({})

    assert.deepInclude(result.value, { status: 401, code: 'REFRESH_TOKEN_MISSING' })
  })

  test('token ilegível ou desconhecido é 401 REFRESH_TOKEN_INVALID', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ refreshToken: 'lixo' })

    assert.deepInclude(result.value, { status: 401, code: 'REFRESH_TOKEN_INVALID' })
  })

  test('conta arquivada, inativa ou apagada não renova', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    const user = await seedUser(users, { inactive: true })

    const inactive = await useCase.execute({ refreshToken: 'refresh-ok' })
    await users.delete(user)
    const gone = await useCase.execute({ refreshToken: 'refresh-ok' })

    assert.deepInclude(inactive.value, { status: 401, code: 'REFRESH_TOKEN_INVALID' })
    assert.deepInclude(gone.value, { status: 401, code: 'REFRESH_TOKEN_INVALID' })
    assert.deepEqual(sessions.issued, [])
  })

  test('falha do repositório é 500 SESSION_REFRESH_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    users.findById = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({ refreshToken: 'refresh-ok' })

    assert.deepInclude(result.value, { status: 500, code: 'SESSION_REFRESH_ERROR' })
  })
})
