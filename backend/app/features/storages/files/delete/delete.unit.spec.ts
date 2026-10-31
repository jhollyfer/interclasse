import { test } from '@japa/runner'

import StoragesFileDeleteUseCase from './delete.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import { MultipartContract } from '#services/multipart/multipart.contract'
import { makeWithMemory } from '#tests/container-fixtures'
import { FILE_ID, pendingFile, storageDoubles, uploadedFile } from '#tests/storages-unit-fixtures'

async function setup() {
  const doubles = storageDoubles()
  const useCase = await makeWithMemory(StoragesFileDeleteUseCase, [
    [StorageRepository, doubles.storages],
    [StorageContract, doubles.bucket],
    [MultipartContract, doubles.multipart],
  ])

  return { ...doubles, useCase }
}

test.group('storages/files > delete (unit)', () => {
  test('orphan file goes: binary and row', async ({ assert }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(uploadedFile())

    const result = await useCase.execute({ id: FILE_ID })

    assert.isTrue(result.isRight())
    assert.deepEqual(bucket.discarded, ['capa.png'])
    assert.isNull(await storages.findById(FILE_ID))
  })

  test('file in use is 409 STORAGE_IN_USE and nothing is deleted', async ({ assert }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(uploadedFile())
    storages.markUsed(FILE_ID, ['avatar de usuário'])

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 409, code: 'STORAGE_IN_USE' })
    assert.deepEqual(bucket.discarded, [])
    assert.isNotNull(await storages.findById(FILE_ID))
  })

  test('PENDING multipart is cancelled: aborts the upload and deletes the row', async ({
    assert,
  }) => {
    const { storages, multipart, useCase } = await setup()
    await storages.save(pendingFile({ uploadId: 'up' }))

    const result = await useCase.execute({ id: FILE_ID })

    assert.isTrue(result.isRight())
    assert.deepEqual(multipart.aborted, ['capa.png'])
    assert.isNull(await storages.findById(FILE_ID))
  })

  test('PENDING single-part deletes the object, and the missing object is not an error', async ({
    assert,
  }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(pendingFile())
    bucket.discard = async () => {
      throw new Error('object does not exist')
    }

    const result = await useCase.execute({ id: FILE_ID })

    assert.isTrue(result.isRight())
    assert.isNull(await storages.findById(FILE_ID))
  })

  test('nonexistent file is 404 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 404, code: 'STORAGE_NOT_FOUND' })
  })
})
