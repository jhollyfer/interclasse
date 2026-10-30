import { test } from '@japa/runner'

import StoragesFilePaginateUseCase from './paginate.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { pendingFile, rightOf, storageDoubles, uploadedFile } from '#tests/storages-unit-fixtures'

async function setup() {
  const { storages } = storageDoubles()
  const useCase = await makeWithMemory(StoragesFilePaginateUseCase, [[StorageRepository, storages]])

  return { storages, useCase }
}

test.group('storages/files > paginate (unit)', () => {
  test('lista a primeira página, vinte por vez', async ({ assert }) => {
    const { storages, useCase } = await setup()
    await storages.save(uploadedFile('1d2c3b4a-5f6e-4d8c-9b0a-1f2e3d4c5b61'))

    const page = rightOf(await useCase.execute({}))

    assert.equal(page.meta.total, 1)
    assert.equal(page.meta.perPage, 20)
  })

  test('filtra por status', async ({ assert }) => {
    const { storages, useCase } = await setup()
    await storages.save(uploadedFile('1d2c3b4a-5f6e-4d8c-9b0a-1f2e3d4c5b61'))
    await storages.save(pendingFile({ id: '2e3d4c5b-6a7f-4e9d-8c1b-2a3f4e5d6c72' }))

    const page = rightOf(await useCase.execute({ status: 'PENDING' }))

    assert.deepEqual(
      page.data.map((item) => item.id),
      ['2e3d4c5b-6a7f-4e9d-8c1b-2a3f4e5d6c72'],
    )
  })

  test('falha do repositório é 500 FILE_PAGINATE_ERROR', async ({ assert }) => {
    const { storages, useCase } = await setup()
    storages.paginate = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({})

    assert.deepInclude(result.value, { status: 500, code: 'FILE_PAGINATE_ERROR' })
  })
})
