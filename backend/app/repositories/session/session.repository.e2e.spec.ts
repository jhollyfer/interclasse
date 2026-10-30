import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'

import { SessionLucidRepository } from './session.lucid.repository.ts'
import { SessionMemoryRepository } from './session.memory.repository.ts'
import type { SessionRepository } from './session.repository.ts'

import { UserFactory } from '#database/factories/user.factory'
import { resetDatabase } from '#tests/http-fixtures'

type Pair = { readonly sessions: SessionRepository; readonly userId: string }

/**
 * O mesmo contrato nas duas implementações (`_standards/domain.md` §5.4): é o
 * que garante que o unitário do use-case, que roda na de memória, não passa
 * contra um dublê que mente.
 */
const IMPLEMENTATIONS = {
  lucid: async (): Promise<Pair> => {
    const user = await UserFactory.create()

    return { sessions: await app.container.make(SessionLucidRepository), userId: user.id }
  },
  memory: async (): Promise<Pair> => ({
    sessions: new SessionMemoryRepository(),
    userId: randomUUID(),
  }),
} satisfies Record<string, () => Promise<Pair>>

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`SessionRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('o token de refresh emitido é lido de volta com o dono', async ({ assert }) => {
      const { sessions, userId } = await make()

      const issued = await sessions.issue(userId)
      const refreshToken = issued?.refreshToken ?? ''
      const grant = await sessions.readRefresh(refreshToken)

      assert.equal(grant?.userId, userId)
    })

    test('token ilegível ou inexistente é null', async ({ assert }) => {
      const { sessions } = await make()

      assert.isNull(await sessions.readRefresh('lixo'))
    })

    test('revoke apaga o token uma vez; a segunda devolve false', async ({ assert }) => {
      const { sessions, userId } = await make()
      const issued = await sessions.issue(userId)
      const refreshToken = issued?.refreshToken ?? ''
      const grant = await sessions.readRefresh(refreshToken)

      assert.isTrue(await sessions.revoke(userId, grant?.identifier ?? ''))
      assert.isFalse(await sessions.revoke(userId, grant?.identifier ?? ''))
      assert.isNull(await sessions.readRefresh(refreshToken))
    })

    test('revokeAll derruba todas as sessões da conta e só dela', async ({ assert }) => {
      const { sessions, userId } = await make()
      const stranger = await UserFactory.create()
      const mine = await sessions.issue(userId)
      const theirs = await sessions.issue(stranger.id)

      await sessions.revokeAll(userId)

      assert.isNull(await sessions.readRefresh(mine?.refreshToken ?? ''))
      assert.isNotNull(await sessions.readRefresh(theirs?.refreshToken ?? ''))
    })
  })
}
