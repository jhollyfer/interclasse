import { test } from '@japa/runner'

import StoragesFileDownloadUseCase from './download.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import { makeWithMemory } from '#tests/container-fixtures'
import { FILE_ID, rightOf, storageDoubles, uploadedFile } from '#tests/storages-unit-fixtures'

async function setup() {
  const doubles = storageDoubles()
  const useCase = await makeWithMemory(StoragesFileDownloadUseCase, [
    [StorageRepository, doubles.storages],
    [StorageContract, doubles.bucket],
  ])

  return { ...doubles, useCase }
}

test.group('storages/files > download (unit)', () => {
  test('devolve a URL assinada com o nome original', async ({ assert }) => {
    const { storages, useCase } = await setup()
    await storages.save(uploadedFile())

    const url = rightOf(await useCase.execute({ id: FILE_ID }))

    assert.include(url, 'capa.png')
  })

  test('arquivo inexistente é 404 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 404, code: 'STORAGE_NOT_FOUND' })
  })

  test('falha do bucket é 500 FILE_DOWNLOAD_ERROR', async ({ assert }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(uploadedFile())
    bucket.signedDownload = async () => {
      throw new Error('bucket fora')
    }

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 500, code: 'FILE_DOWNLOAD_ERROR' })
  })
})
