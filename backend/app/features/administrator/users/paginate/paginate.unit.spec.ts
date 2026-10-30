import { test } from '@japa/runner'

import AdministratorUserPaginateUseCase from './paginate.use-case.ts'

import { UserRepository } from '#repositories/user/user.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { identityDoubles, OTHER_ID, seedUser, USER_ID } from '#tests/identity-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const doubles = identityDoubles()
  const useCase = await makeWithMemory(AdministratorUserPaginateUseCase, [
    [UserRepository, doubles.users],
  ])

  return { ...doubles, useCase }
}

test.group('administrator/users > paginate (unit)', () => {
  test('lista só as contas vivas, por nome, vinte por página', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users, { id: USER_ID, name: 'Zeca', email: 'zeca@mail.com' })
    await seedUser(users, { id: OTHER_ID, name: 'Ana', email: 'ana@mail.com' })
    await seedUser(users, {
      id: '3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f',
      name: 'Arquivada',
      email: 'arq@mail.com',
      archived: true,
    })

    const page = rightOf(await useCase.execute({}))

    assert.deepEqual(
      page.data.map((user) => user.name),
      ['Ana', 'Zeca'],
    )
    assert.equal(page.meta.perPage, 20)
  })

  test('?trashed=only traz a lixeira, e papel e status recortam', async ({ assert }) => {
    const { users, useCase } = await setup()
    await seedUser(users, { id: USER_ID, name: 'Ana', email: 'ana@mail.com', role: 'ADVISOR' })
    await seedUser(users, {
      id: OTHER_ID,
      name: 'Bia',
      email: 'bia@mail.com',
      role: 'ADMINISTRATOR',
      inactive: true,
    })
    await seedUser(users, {
      id: '3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f',
      name: 'Caio',
      email: 'caio@mail.com',
      archived: true,
    })

    const trash = rightOf(await useCase.execute({ trashed: 'only' }))
    const admins = rightOf(await useCase.execute({ role: 'ADMINISTRATOR' }))
    const inactive = rightOf(await useCase.execute({ status: 'INACTIVE' }))
    const found = rightOf(await useCase.execute({ search: 'ANA' }))

    assert.deepEqual(
      trash.data.map((user) => user.name),
      ['Caio'],
    )
    assert.deepEqual(
      admins.data.map((user) => user.name),
      ['Bia'],
    )
    assert.deepEqual(
      inactive.data.map((user) => user.name),
      ['Bia'],
    )
    assert.deepEqual(
      found.data.map((user) => user.name),
      ['Ana'],
    )
  })

  test('falha do repositório é 500 USER_PAGINATE_ERROR', async ({ assert }) => {
    const { users, useCase } = await setup()
    users.paginate = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({})

    assert.deepInclude(result.value, { status: 500, code: 'USER_PAGINATE_ERROR' })
  })
})
