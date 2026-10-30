import { test } from '@japa/runner'

import AccountProfileUpdateUseCase from './update.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UserRepository } from '#repositories/user/user.repository'
import { SessionContract } from '#services/session/session.contract'
import { makeWithMemory } from '#tests/unit-fixtures'
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
    [SessionContract, doubles.sessions],
    [UnitOfWork, doubles.unitOfWork],
  ])

  return { ...doubles, useCase }
}

test.group('account/profile > update (unit)', () => {
  test('só o nome muda: as sessões ficam', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    const profile = rightOf(await useCase.execute({ actor: ACTOR, name: 'Ana Maria' }))

    assert.equal(profile.name, 'Ana Maria')
    assert.deepEqual(sessions.revokedAll, [])
  })

  test('trocar o e-mail derruba as sessões', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    await useCase.execute({ actor: ACTOR, email: 'nova@mail.com' })

    assert.deepEqual(sessions.revokedAll, [USER_ID])
  })

  test('trocar a senha com a atual correta grava a nova e derruba as sessões', async ({
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

  test('senha atual errada ou ausente é 422 CURRENT_PASSWORD_INVALID', async ({ assert }) => {
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

  test('senha nova igual à atual é 422 PASSWORD_SAME_AS_CURRENT', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)

    const result = await useCase.execute({
      actor: ACTOR,
      password: PASSWORD,
      currentPassword: PASSWORD,
    })

    assert.deepInclude(result.value, { status: 422, code: 'PASSWORD_SAME_AS_CURRENT' })
  })

  test('e-mail de outra conta é 409 USER_ALREADY_EXISTS', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    await seedUser(users, { id: OTHER_ID, email: 'outra@mail.com' })

    const result = await useCase.execute({ actor: ACTOR, email: 'outra@mail.com' })

    assert.deepInclude(result.value, { status: 409, code: 'USER_ALREADY_EXISTS' })
  })

  test('avatar ainda PENDING é 422 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { users, storages, useCase } = await setup()
    await seedUser(users)
    await storages.save(pendingFile())

    const result = await useCase.execute({
      actor: ACTOR,
      avatarId: '8a7b6c5d-4e3f-4a2b-9c1d-0e9f8a7b6c5d',
    })

    assert.deepInclude(result.value, { status: 422, code: 'STORAGE_NOT_FOUND' })
  })

  test('a corrida no unique do banco é 409 USER_ALREADY_EXISTS', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    users.save = async () => {
      throw Object.assign(new Error('duplicate key'), { code: '23505' })
    }

    const result = await useCase.execute({ actor: ACTOR, name: 'x' })

    assert.deepInclude(result.value, { status: 409, code: 'USER_ALREADY_EXISTS' })
  })

  test('falha do repositório é 500 PROFILE_UPDATE_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    users.save = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({ actor: ACTOR, name: 'x' })

    assert.deepInclude(result.value, { status: 500, code: 'PROFILE_UPDATE_ERROR' })
  })
})
