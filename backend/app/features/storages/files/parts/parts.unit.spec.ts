import { test } from '@japa/runner'

import StoragesFilePartsUseCase from './parts.use-case.ts'

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
  const useCase = await makeWithMemory(StoragesFilePartsUseCase, [
    [StorageRepository, doubles.storages],
    [StorageContract, doubles.bucket],
    [MultipartContract, doubles.multipart],
  ])

  return { ...doubles, useCase }
}

test.group('storages/files > parts (unit)', () => {
  test('arquivo confirmado responde com as listas vazias', async ({ assert }) => {
    const { storages, useCase } = await setup()
    await storages.save(uploadedFile())

    const result = await useCase.execute({ id: FILE_ID })

    const plan = rightOf(result)
    assert.deepInclude(plan, { parts: [], uploaded: [] })
    assert.equal(plan.storage.status, 'UPLOADED')
    assert.isString(plan.storage.url)
  })

  test('parte única sem objeto no bucket pede a URL da parte 1', async ({ assert }) => {
    const { storages, useCase } = await setup()
    await storages.save(pendingFile())

    const result = await useCase.execute({ id: FILE_ID })

    const plan = rightOf(result)
    assert.deepEqual(plan.uploaded, [])
    assert.deepEqual(
      plan.parts.map((part) => part.partNumber),
      [1],
    )
  })

  test('parte única já no bucket volta como enviada e sem URL a assinar', async ({ assert }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(pendingFile())
    bucket.put('capa.png', { contentLength: 1024, etag: 'e1' })

    const result = await useCase.execute({ id: FILE_ID })

    const plan = rightOf(result)
    assert.deepEqual(plan.uploaded, [{ partNumber: 1, size: 1024, etag: 'e1' }])
    assert.deepEqual(plan.parts, [])
  })

  test('multipart reassina só as partes que faltam', async ({ assert }) => {
    const { storages, multipart, useCase } = await setup()
    await storages.save(pendingFile({ uploadId: 'up' }))
    multipart.withUploaded('up', [{ partNumber: 1, size: 10, etag: 'a' }])

    const result = await useCase.execute({ id: FILE_ID })

    const plan = rightOf(result)
    assert.deepEqual(plan.uploaded, [{ partNumber: 1, size: 10, etag: 'a' }])
    assert.deepEqual(plan.parts, [])
  })

  test('arquivo inexistente é 404 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 404, code: 'STORAGE_NOT_FOUND' })
  })
})
