import { test } from '@japa/runner'

import StoragesFileCompleteUseCase from './complete.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import { MultipartContract } from '#services/multipart/multipart.contract'
import { makeWithMemory } from '#tests/container-fixtures'
import {
  FILE_ID,
  pendingFile,
  rightOf,
  storageDoubles,
  uploadedFile,
} from '#tests/storages-unit-fixtures'

async function setup() {
  const doubles = storageDoubles()
  const useCase = await makeWithMemory(StoragesFileCompleteUseCase, [
    [StorageRepository, doubles.storages],
    [StorageContract, doubles.bucket],
    [MultipartContract, doubles.multipart],
  ])

  return { ...doubles, useCase }
}

test.group('storages/files > complete (unit)', () => {
  test('checks the size in the bucket and becomes UPLOADED', async ({ assert }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(pendingFile())
    bucket.put('capa.png', { contentLength: 1024 })

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(rightOf(result), { status: 'UPLOADED', uploadId: null })
  })

  test('multipart asks the bucket to reassemble the parts', async ({ assert }) => {
    const { storages, bucket, multipart, useCase } = await setup()
    await storages.save(pendingFile({ uploadId: 'up' }))
    bucket.put('capa.png', { contentLength: 1024 })

    await useCase.execute({ id: FILE_ID, parts: [{ partNumber: 1, etag: 'x' }] })

    assert.deepEqual(multipart.completed, ['capa.png'])
  })

  test('size different from the declared deletes binary and row: 422 STORAGE_SIZE_MISMATCH', async ({
    assert,
  }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(pendingFile())
    bucket.put('capa.png', { contentLength: 10 })

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 422, code: 'STORAGE_SIZE_MISMATCH' })
    assert.deepEqual(bucket.discarded, ['capa.png'])
    assert.isNull(await storages.findById(FILE_ID))
  })

  test('.png with SVG bytes deletes binary and row: 422 STORAGE_CONTENT_MISMATCH', async ({
    assert,
  }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(pendingFile())
    bucket.put('capa.png', { contentLength: 1024 }, new TextEncoder().encode('<svg xmlns="http'))

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 422, code: 'STORAGE_CONTENT_MISMATCH' })
    assert.deepEqual(bucket.discarded, ['capa.png'])
    assert.isNull(await storages.findById(FILE_ID))
  })

  test('confirming again returns the same record without querying the bucket', async ({
    assert,
  }) => {
    const { storages, useCase } = await setup()
    await storages.save(uploadedFile())

    const result = await useCase.execute({ id: FILE_ID })

    assert.equal(rightOf(result).status, 'UPLOADED')
  })

  test('nonexistent file is 404 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 404, code: 'STORAGE_NOT_FOUND' })
  })

  test('bucket failure is 500 STORAGES_FILE_COMPLETE_ERROR', async ({ assert }) => {
    const { storages, useCase } = await setup()
    await storages.save(pendingFile())

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 500, code: 'STORAGES_FILE_COMPLETE_ERROR' })
  })
})
