import { test } from '@japa/runner'
import { left } from '@interclasse/shared'

import AccountProfileUpdateUseCase from './update.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UserRepository } from '#repositories/user/user.repository'
import { SessionRepository } from '#repositories/session/session.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import {
  identityDoubles,
  OTHER_ID,
  PASSWORD,
  seedUser,
  USER_ID,
} from '#tests/identity-unit-fixtures'
import { pendingFile, rightOf } from '#tests/storages-unit-fixtures'

const ACTOR = { id: USER_ID, role: 'ADVISOR', avatarId: null } as const

async function setup() {
  const doubles = identityDoubles()
  const useCase = await makeWithMemory(AccountProfileUpdateUseCase, [
    [UserRepository, doubles.users],
    [StorageRepository, doubles.storages],
    [SessionRepository, doubles.sessions],
    [UnitOfWork, doubles.unitOfWork],
  ])

  return { ...doubles, useCase }
}

test.group('account/profile > update (unit)', () => {
  test('only the name changes: sessions stay', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    const profile = rightOf(await useCase.execute({ actor: ACTOR, name: 'Ana Maria' }))

    assert.equal(profile.name, 'Ana Maria')
    assert.deepEqual(sessions.revokedAll, [])
  })

  test('changing the email drops the sessions', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    await useCase.execute({ actor: ACTOR, email: 'nova@mail.com' })

    assert.deepEqual(sessions.revokedAll, [USER_ID])
  })

  test('changing the password with the correct current one saves the new one and drops the sessions', async ({
    assert,
  }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    const result = await useCase.execute({
      actor: ACTOR,
      password: 'Nova@12345',
      currentPassword: PASSWORD,
    })

    assert.isTrue(result.isRight())
    assert.deepEqual(sessions.revokedAll, [USER_ID])
  })

  test('wrong or missing current password is 422 CURRENT_PASSWORD_INVALID', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    const wrong = await useCase.execute({
      actor: ACTOR,
      password: 'Nova@12345',
      currentPassword: 'Errada@123',
    })
    const absent = await useCase.execute({ actor: ACTOR, password: 'Nova@12345' })

    assert.deepInclude(wrong.value, { status: 422, code: 'CURRENT_PASSWORD_INVALID' })
    assert.deepInclude(absent.value, { status: 422, code: 'CURRENT_PASSWORD_INVALID' })
    assert.deepEqual(sessions.revokedAll, [])
  })

  test('new password equal to the current one is 422 PASSWORD_SAME_AS_CURRENT', async ({
    assert,
  }) => {
    const { users, useCase } = await setup()
    await seedUser(users)

    const result = await useCase.execute({
      actor: ACTOR,
      password: PASSWORD,
      currentPassword: PASSWORD,
    })

    assert.deepInclude(result.value, { status: 422, code: 'PASSWORD_SAME_AS_CURRENT' })
  })

  test('email of another account is 409 USER_ALREADY_EXISTS', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    await seedUser(users, { id: OTHER_ID, email: 'outra@mail.com' })

    const result = await useCase.execute({ actor: ACTOR, email: 'outra@mail.com' })

    assert.deepInclude(result.value, { status: 409, code: 'USER_ALREADY_EXISTS' })
  })

  test('still PENDING avatar is 422 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { users, storages, useCase } = await setup()
    await seedUser(users)
    await storages.save(pendingFile())

    const result = await useCase.execute({
      actor: ACTOR,
      avatarId: '8a7b6c5d-4e3f-4a2b-9c1d-0e9f8a7b6c5d',
    })

    assert.deepInclude(result.value, { status: 422, code: 'STORAGE_NOT_FOUND' })
  })

  test('the race on the database unique (repository fact) is 409 USER_ALREADY_EXISTS', async ({
    assert,
  }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    users.save = async () => left({ code: 'USER_ALREADY_EXISTS' })

    const result = await useCase.execute({ actor: ACTOR, name: 'x' })

    assert.deepInclude(result.value, { status: 409, code: 'USER_ALREADY_EXISTS' })
  })

  test('repository failure is 500 ACCOUNT_PROFILE_UPDATE_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    users.save = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({ actor: ACTOR, name: 'x' })

    assert.deepInclude(result.value, { status: 500, code: 'ACCOUNT_PROFILE_UPDATE_ERROR' })
  })
})
