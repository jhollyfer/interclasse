import { test } from '@japa/runner'
import { left } from '@interclasse/shared'

import AdministratorUserUpdateUseCase from './update.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UserRepository } from '#repositories/user/user.repository'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { SessionRepository } from '#repositories/session/session.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { identityDoubles, OTHER_ID, seedUser, USER_ID } from '#tests/identity-unit-fixtures'
import { rightOf, uploadedFile } from '#tests/storages-unit-fixtures'

async function setup() {
  const doubles = identityDoubles()
  const useCase = await makeWithMemory(AdministratorUserUpdateUseCase, [
    [UserRepository, doubles.users],
    [StorageRepository, doubles.storages],
    [SessionRepository, doubles.sessions],
    [ClassroomRepository, doubles.classrooms],
    [UnitOfWork, doubles.unitOfWork],
  ])

  return { ...doubles, useCase }
}

test.group('administrator/users > update (unit)', () => {
  test('only the name changes: neither drops the session nor releases the classroom', async ({
    assert,
  }) => {
    const { users, sessions, classrooms, useCase } = await setup()
    await seedUser(users)

    const updated = rightOf(await useCase.execute({ id: USER_ID, name: 'Ana Maria' }))

    assert.deepInclude(updated, { name: 'Ana Maria', email: 'ana@mail.com' })
    assert.deepEqual(sessions.revokedAll, [])
    assert.deepEqual(classrooms.detachedAccounts, [])
  })

  test('changing the role drops the sessions and releases the classrooms', async ({ assert }) => {
    const { users, sessions, classrooms, useCase } = await setup()
    await seedUser(users)

    const updated = rightOf(await useCase.execute({ id: USER_ID, role: 'REPRESENTATIVE' }))

    assert.equal(updated.role, 'REPRESENTATIVE')
    assert.deepEqual(sessions.revokedAll, [USER_ID])
    assert.deepEqual(classrooms.detachedAccounts, [USER_ID])
  })

  test('changing the email or deactivating drops the sessions, but does not release the classroom', async ({
    assert,
  }) => {
    const { users, sessions, classrooms, useCase } = await setup()
    await seedUser(users)

    await useCase.execute({ id: USER_ID, email: 'nova@mail.com' })
    await useCase.execute({ id: USER_ID, status: 'INACTIVE' })

    assert.deepEqual(sessions.revokedAll, [USER_ID, USER_ID])
    assert.deepEqual(classrooms.detachedAccounts, [])
  })

  test('changing the password drops the sessions', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    await useCase.execute({ id: USER_ID, password: 'Nova@12345' })

    assert.deepEqual(sessions.revokedAll, [USER_ID])
  })

  test('avatarId null removes the photo', async ({ assert }) => {
    const { users, storages, useCase } = await setup()
    await storages.save(uploadedFile())
    await seedUser(users)
    await useCase.execute({ id: USER_ID, avatarId: '8a7b6c5d-4e3f-4a2b-9c1d-0e9f8a7b6c5d' })

    const updated = rightOf(await useCase.execute({ id: USER_ID, avatarId: null }))

    assert.isNull(updated.avatar)
  })

  test('nonexistent or archived account is 404 USER_NOT_FOUND', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users, { archived: true })

    const result = await useCase.execute({ id: USER_ID, name: 'x' })

    assert.deepInclude(result.value, { status: 404, code: 'USER_NOT_FOUND' })
  })

  test('email of another account, live or archived, is 409 USER_ALREADY_EXISTS', async ({
    assert,
  }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    await seedUser(users, { id: OTHER_ID, email: 'outra@mail.com', archived: true })

    const result = await useCase.execute({ id: USER_ID, email: 'outra@mail.com' })

    assert.deepInclude(result.value, { status: 409, code: 'USER_ALREADY_EXISTS' })
  })

  test('the same email again is not a conflict', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)

    const result = await useCase.execute({ id: USER_ID, email: 'ana@mail.com' })

    assert.isTrue(result.isRight())
  })

  test('nonexistent avatar is 422 STORAGE_NOT_FOUND and nothing is saved', async ({ assert }) => {
    const { users, sessions, useCase } = await setup()
    await seedUser(users)

    const result = await useCase.execute({
      id: USER_ID,
      role: 'ADMINISTRATOR',
      avatarId: '0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f',
    })

    assert.deepInclude(result.value, { status: 422, code: 'STORAGE_NOT_FOUND' })
    assert.deepEqual(sessions.revokedAll, [])
    const stored = await users.findById(USER_ID)
    assert.equal(stored?.snapshot().role, 'ADVISOR')
  })

  test('the race on the database unique (repository fact) is 409 USER_ALREADY_EXISTS', async ({
    assert,
  }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    users.save = async () => left({ code: 'USER_ALREADY_EXISTS' })

    const result = await useCase.execute({ id: USER_ID, name: 'x' })

    assert.deepInclude(result.value, { status: 409, code: 'USER_ALREADY_EXISTS' })
  })

  test('repository failure is 500 ADMINISTRATOR_USER_UPDATE_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    users.save = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({ id: USER_ID, name: 'x' })

    assert.deepInclude(result.value, { status: 500, code: 'ADMINISTRATOR_USER_UPDATE_ERROR' })
  })
})
