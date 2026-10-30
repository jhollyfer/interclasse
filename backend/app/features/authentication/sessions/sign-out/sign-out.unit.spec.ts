import { test } from '@japa/runner'

import AuthenticationSessionSignOutUseCase from './sign-out.use-case.ts'

import { SessionRepository } from '#repositories/session/session.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { identityDoubles, USER_ID } from '#tests/identity-unit-fixtures'

const ACTOR = { id: USER_ID, role: 'ADVISOR', avatarId: null } as const

async function setup() {
  const doubles = identityDoubles()
  doubles.sessions.withRefresh('refresh-ok', { userId: USER_ID, identifier: '8' })
  doubles.sessions.withRefresh('access-id', { userId: USER_ID, identifier: '7' })
  const useCase = await makeWithMemory(AuthenticationSessionSignOutUseCase, [
    [SessionRepository, doubles.sessions],
  ])

  return { ...doubles, useCase }
}

test.group('authentication/sessions > sign-out (unit)', () => {
  test('apaga o token de acesso e o de refresh da conta', async ({ assert }) => {
    const { sessions, useCase } = await setup()

    const result = await useCase.execute({
      actor: ACTOR,
      accessTokenId: '7',
      refreshToken: 'refresh-ok',
    })

    assert.isTrue(result.isRight())
    // Já apagados: apagar de novo não acha linha nenhuma.
    assert.isFalse(await sessions.revoke(USER_ID, '7'))
    assert.isFalse(await sessions.revoke(USER_ID, '8'))
  })

  test('refresh ilegível não impede a saída', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ actor: ACTOR, accessTokenId: '7', refreshToken: 'lixo' })

    assert.isTrue(result.isRight())
  })

  test('sem tokens a saída também responde certo', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ actor: ACTOR })

    assert.isTrue(result.isRight())
  })

  test('falha do bucket de sessão é 500 SESSION_SIGN_OUT_ERROR', async ({ assert }) => {
    const { sessions, useCase } = await setup()
    sessions.revoke = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({ actor: ACTOR, accessTokenId: '7' })

    assert.deepInclude(result.value, { status: 500, code: 'AUTHENTICATION_SESSION_SIGN_OUT_ERROR' })
  })
})
