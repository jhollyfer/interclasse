import { test } from '@japa/runner'

import StoragesFileShowUseCase from './show.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { makeWithMemory } from '#tests/unit-fixtures'
import { FILE_ID, rightOf, storageDoubles, uploadedFile } from '#tests/storages-unit-fixtures'

async function setup() {
  const { storages } = storageDoubles()
  const useCase = await makeWithMemory(StoragesFileShowUseCase, [[StorageRepository, storages]])

  return { storages, useCase }
}

test.group('storages/files > show (unit)', () => {
  test('devolve o registro com a url', async ({ assert }) => {
    const { storages, useCase } = await setup()
    await storages.save(uploadedFile())

    const file = rightOf(await useCase.execute({ id: FILE_ID }))

    assert.deepInclude(file, { id: FILE_ID, originalName: 'capa.png', status: 'UPLOADED' })
    assert.isString(file.url)
  })

  test('arquivo inexistente é 404 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 404, code: 'STORAGE_NOT_FOUND' })
  })

  test('falha do repositório é 500 FILE_SHOW_ERROR', async ({ assert }) => {
    const { storages, useCase } = await setup()
    storages.detail = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 500, code: 'FILE_SHOW_ERROR' })
  })
})
