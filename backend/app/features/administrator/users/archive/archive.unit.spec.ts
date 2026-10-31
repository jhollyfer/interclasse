import { test } from '@japa/runner'

import AdministratorUserArchiveUseCase from './archive.use-case.ts'

import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UserRepository } from '#repositories/user/user.repository'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { SessionRepository } from '#repositories/session/session.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { identityDoubles, seedUser, USER_ID } from '#tests/identity-unit-fixtures'

async function setup() {
  const doubles = identityDoubles()
  const useCase = await makeWithMemory(AdministratorUserArchiveUseCase, [
    [UserRepository, doubles.users],
    [SessionRepository, doubles.sessions],
    [ClassroomRepository, doubles.classrooms],
    [UnitOfWork, doubles.unitOfWork],
  ])

  return { ...doubles, useCase }
}

test.group('administrator/users > archive (unit)', () => {
  test('archives, drops the sessions and releases the classrooms', async ({ assert }) => {
    const { users, sessions, classrooms, useCase } = await setup()
    await seedUser(users)

    const result = await useCase.execute({ id: USER_ID })

    assert.isTrue(result.isRight())
    assert.isNull(await users.findById(USER_ID))
    assert.isNotNull(await users.findArchivedById(USER_ID))
    assert.deepEqual(sessions.revokedAll, [USER_ID])
    assert.deepEqual(classrooms.detachedAccounts, [USER_ID])
  })

  test('archiving twice responds 409 USER_ALREADY_ARCHIVED on the second', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    await useCase.execute({ id: USER_ID })

    const second = await useCase.execute({ id: USER_ID })

    assert.deepInclude(second.value, { status: 409, code: 'USER_ALREADY_ARCHIVED' })
  })

  test('nonexistent account neither revokes nor releases anything', async ({ assert }) => {
    const { sessions, classrooms, useCase } = await setup()

    const result = await useCase.execute({ id: USER_ID })

    assert.deepInclude(result.value, { status: 404, code: 'USER_NOT_FOUND' })
    assert.deepEqual(sessions.revokedAll, [])
    assert.deepEqual(classrooms.detachedAccounts, [])
  })

  test('repository failure is 500 ADMINISTRATOR_USER_ARCHIVE_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users)
    users.save = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({ id: USER_ID })

    assert.deepInclude(result.value, { status: 500, code: 'ADMINISTRATOR_USER_ARCHIVE_ERROR' })
  })
})
