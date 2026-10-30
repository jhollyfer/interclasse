import { test } from '@japa/runner'

import StoragesFileCreateUseCase from './create.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import { MultipartContract, PART_SIZE } from '#services/multipart/multipart.contract'
import { makeWithMemory } from '#tests/container-fixtures'
import { rightOf, storageDoubles } from '#tests/storages-unit-fixtures'

async function setup() {
  const doubles = storageDoubles()
  const useCase = await makeWithMemory(StoragesFileCreateUseCase, [
    [StorageRepository, doubles.storages],
    [StorageContract, doubles.bucket],
    [MultipartContract, doubles.multipart],
  ])

  return { ...doubles, useCase }
}

test.group('storages/files > create (unit)', () => {
  test('arquivo de uma parte nasce PENDING com uma URL e sem uploadId', async ({ assert }) => {
    const { storages, useCase } = await setup()

    const result = await useCase.execute({
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: 1024,
    })

    const plan = rightOf(result)
    assert.isNull(plan.uploadId)
    assert.equal(plan.totalParts, 1)
    assert.lengthOf(plan.parts, 1)
    assert.isUndefined(plan.storage.url)
    const saved = await storages.detail(plan.storage.id)
    assert.equal(saved?.status, 'PENDING')
  })

  test('arquivo maior que uma parte abre o multipart e assina o primeiro lote', async ({
    assert,
  }) => {
    const { multipart, useCase } = await setup()

    const result = await useCase.execute({
      fileName: 'video.mp3',
      mimetype: 'audio/mpeg',
      size: PART_SIZE * 2 + 1,
    })

    const plan = rightOf(result)
    assert.equal(plan.totalParts, 3)
    assert.isString(plan.uploadId)
    assert.lengthOf(multipart.initiated, 1)
  })

  test('falha ao gravar aborta o multipart e responde 500 FILE_CREATE_ERROR', async ({
    assert,
  }) => {
    const { storages, multipart, useCase } = await setup()
    storages.save = async () => {
      throw new Error('banco fora')
    }

    const result = await useCase.execute({
      fileName: 'video.mp3',
      mimetype: 'audio/mpeg',
      size: PART_SIZE * 2,
    })

    assert.deepInclude(result.value, { status: 500, code: 'STORAGES_FILE_CREATE_ERROR' })
    assert.lengthOf(multipart.aborted, 1)
  })
})
