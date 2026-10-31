import { test } from '@japa/runner'
import { AuthorizationResponse } from '@adonisjs/bouncer'
import { USER_ROLE, USER_ROLES, type Actor, type UserRole } from '@interclasse/shared'

import UserPolicy from './user.policy.ts'

import { User } from '#domain/user/user.entity'
import { OTHER_ID, USER_ID } from '#tests/identity-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

function actorOf(role: UserRole, id = USER_ID): Actor {
  return { id, role, avatarId: null }
}

function accountOf(id: string): User {
  return User.create({
    id,
    name: 'Ana',
    email: 'ana@mail.com',
    password: 'Senha@123',
    role: USER_ROLE.ADVISOR,
    now: new Date('2026-10-29T12:00:00Z'),
  })
}

function denied(response: unknown): { status: number | undefined; code: string | undefined } {
  if (!(response instanceof AuthorizationResponse)) return { status: undefined, code: undefined }

  return { status: response.status, code: response.translation?.identifier }
}

const OWN = accountOf(USER_ID)
const OTHER = accountOf(OTHER_ID)

test.group('policies > user (unit)', () => {
  for (const role of USER_ROLES) {
    test(`${role}: an account owned by someone else passes on update, archive and delete`, async ({
      assert,
    }) => {
      const policy = await makeWithMemory(UserPolicy, [])
      const actor = actorOf(role)

      assert.isTrue(policy.update(actor, OTHER, { role: USER_ROLE.ADVISOR }))
      assert.isTrue(policy.archive(actor, OTHER))
      assert.isTrue(policy.delete(actor, OTHER))
    })

    test(`${role}: the account itself answers 403 on archive and delete`, async ({ assert }) => {
      const policy = await makeWithMemory(UserPolicy, [])
      const actor = actorOf(role)

      assert.deepEqual(denied(policy.archive(actor, OWN)), {
        status: 403,
        code: 'SELF_ARCHIVE_FORBIDDEN',
      })
      assert.deepEqual(denied(policy.delete(actor, OWN)), {
        status: 403,
        code: 'SELF_DELETE_FORBIDDEN',
      })
    })

    test(`${role}: on their own account, role and status are 403 and the name passes`, async ({
      assert,
    }) => {
      const policy = await makeWithMemory(UserPolicy, [])
      const actor = actorOf(role)

      assert.deepEqual(denied(policy.update(actor, OWN, { role: USER_ROLE.ADVISOR })), {
        status: 403,
        code: 'SELF_ACCESS_FORBIDDEN',
      })
      assert.deepEqual(denied(policy.update(actor, OWN, { status: 'INACTIVE' })), {
        status: 403,
        code: 'SELF_ACCESS_FORBIDDEN',
      })
      assert.isTrue(policy.update(actor, OWN, {}))
    })

    test(`${role}: a nonexistent account is 404 USER_NOT_FOUND`, async ({ assert }) => {
      const policy = await makeWithMemory(UserPolicy, [])
      const actor = actorOf(role)
      const expected = { status: 404, code: 'USER_NOT_FOUND' }

      assert.deepEqual(denied(policy.update(actor, null, {})), expected)
      assert.deepEqual(denied(policy.archive(actor, null)), expected)
      assert.deepEqual(denied(policy.delete(actor, null)), expected)
    })
  }
})
