import { test } from '@japa/runner'
import { AuthorizationResponse } from '@adonisjs/bouncer'
import { USER_ROLE, type Actor, type UserRole } from '@interclasse/shared'

import StoragePolicy from './storage.policy.ts'

import { USER_ID } from '#tests/identity-unit-fixtures'
import { FILE_ID, uploadedFile } from '#tests/storages-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

function actorOf(role: UserRole, avatarId: string | null = null): Actor {
  return { id: USER_ID, role, avatarId }
}

function denied(response: unknown): { status: number | undefined; code: string | undefined } {
  if (!(response instanceof AuthorizationResponse)) return { status: undefined, code: undefined }

  return { status: response.status, code: response.translation?.identifier }
}

const NOT_FOUND = { status: 404, code: 'STORAGE_NOT_FOUND' }

test.group('policies > storage (unit)', () => {
  test('ADMINISTRATOR baixa qualquer arquivo', async ({ assert }) => {
    const policy = await makeWithMemory(StoragePolicy, [])

    assert.isTrue(policy.download(actorOf(USER_ROLE.ADMINISTRATOR), uploadedFile()))
  })

  for (const role of [USER_ROLE.ADVISOR, USER_ROLE.REPRESENTATIVE]) {
    test(`${role}: baixa o próprio avatar`, async ({ assert }) => {
      const policy = await makeWithMemory(StoragePolicy, [])

      assert.isTrue(policy.download(actorOf(role, FILE_ID), uploadedFile()))
    })

    test(`${role}: arquivo alheio responde 404, como o inexistente`, async ({ assert }) => {
      const policy = await makeWithMemory(StoragePolicy, [])

      assert.deepEqual(denied(policy.download(actorOf(role), uploadedFile())), NOT_FOUND)
    })
  }

  for (const role of Object.values(USER_ROLE)) {
    test(`${role}: arquivo inexistente responde 404`, async ({ assert }) => {
      const policy = await makeWithMemory(StoragePolicy, [])

      assert.deepEqual(denied(policy.download(actorOf(role, FILE_ID), null)), NOT_FOUND)
    })
  }
})
