import { test } from '@japa/runner'
import { left } from '@interclasse/shared'

import AdministratorUserCreateUseCase from './create.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { UserRepository } from '#repositories/user/user.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { identityDoubles, seedUser, USER_ID } from '#tests/identity-unit-fixtures'
import { pendingFile, rightOf, uploadedFile } from '#tests/storages-unit-fixtures'

async function setup() {
  const doubles = identityDoubles()
  const useCase = await makeWithMemory(AdministratorUserCreateUseCase, [
    [UserRepository, doubles.users],
    [StorageRepository, doubles.storages],
  ])

  return { ...doubles, useCase }
}

const NEW_USER = {
  name: 'Bia',
  email: 'bia@mail.com',
  password: 'Senha@123',
  role: 'ADVISOR',
} as const

test.group('administrator/users > create (unit)', () => {
  test('cria a conta ativa, sem avatar e sem a senha na resposta', async ({ assert }) => {
    const { useCase } = await setup()

    const created = rightOf(await useCase.execute(NEW_USER))

    assert.deepInclude(created, {
      name: 'Bia',
      email: 'bia@mail.com',
      role: 'ADVISOR',
      status: 'ACTIVE',
      avatar: null,
      deletedAt: null,
    })
    assert.notProperty(created, 'password')
  })

  test('devolve a foto aninhada quando o avatar está confirmado', async ({ assert }) => {
    const { storages, useCase } = await setup()
    await storages.save(uploadedFile())

    const created = rightOf(
      await useCase.execute({ ...NEW_USER, avatarId: '8a7b6c5d-4e3f-4a2b-9c1d-0e9f8a7b6c5d' }),
    )

    assert.equal(created.avatar?.originalName, 'capa.png')
  })

  test('avatar inexistente ou ainda PENDING é 422 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { storages, useCase } = await setup()
    await storages.save(pendingFile())

    const missing = await useCase.execute({
      ...NEW_USER,
      avatarId: '0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f',
    })
    const pending = await useCase.execute({
      ...NEW_USER,
      avatarId: '8a7b6c5d-4e3f-4a2b-9c1d-0e9f8a7b6c5d',
    })

    assert.deepInclude(missing.value, { status: 422, code: 'STORAGE_NOT_FOUND' })
    assert.deepInclude(pending.value, { status: 422, code: 'STORAGE_NOT_FOUND' })
  })

  test('e-mail de conta viva é 409 USER_ALREADY_EXISTS', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users, { email: 'bia@mail.com' })

    const result = await useCase.execute(NEW_USER)

    assert.deepInclude(result.value, { status: 409, code: 'USER_ALREADY_EXISTS' })
  })

  test('e-mail de conta arquivada reativa a linha e preserva o id', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users, { email: 'bia@mail.com', archived: true })

    const created = rightOf(await useCase.execute({ ...NEW_USER, role: 'ADMINISTRATOR' }))

    assert.deepInclude(created, { id: USER_ID, role: 'ADMINISTRATOR', deletedAt: null })
  })

  test('a corrida no unique do banco (fato do repository) também é 409 USER_ALREADY_EXISTS', async ({
    assert,
  }) => {
    const { users, useCase } = await setup()
    users.save = async () => left({ code: 'USER_ALREADY_EXISTS' })

    const result = await useCase.execute(NEW_USER)

    assert.deepInclude(result.value, { status: 409, code: 'USER_ALREADY_EXISTS' })
  })

  test('falha do repositório é 500 USER_CREATE_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    users.save = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute(NEW_USER)

    assert.deepInclude(result.value, { status: 500, code: 'USER_CREATE_ERROR' })
  })
})
