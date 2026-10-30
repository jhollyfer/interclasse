import { test } from '@japa/runner'

import StoragesFileDeleteUseCase from './delete.use-case.ts'

import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import { MultipartContract } from '#services/multipart/multipart.contract'
import { makeWithMemory } from '#tests/unit-fixtures'
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
  test('arquivo órfão sai: binário e linha', async ({ assert }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(uploadedFile())

    const result = await useCase.execute({ id: FILE_ID })

    assert.isTrue(result.isRight())
    assert.deepEqual(bucket.discarded, ['capa.png'])
    assert.isNull(await storages.findById(FILE_ID))
  })

  test('arquivo em uso é 409 STORAGE_IN_USE e nada é apagado', async ({ assert }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(uploadedFile())
    storages.markUsed(FILE_ID, ['avatar de usuário'])

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 409, code: 'STORAGE_IN_USE' })
    assert.deepEqual(bucket.discarded, [])
    assert.isNotNull(await storages.findById(FILE_ID))
  })

  test('PENDING multipart é cancelado: aborta o upload e apaga a linha', async ({ assert }) => {
    const { storages, multipart, useCase } = await setup()
    await storages.save(pendingFile({ uploadId: 'up' }))

    const result = await useCase.execute({ id: FILE_ID })

    assert.isTrue(result.isRight())
    assert.deepEqual(multipart.aborted, ['capa.png'])
    assert.isNull(await storages.findById(FILE_ID))
  })

  test('PENDING de parte única apaga o objeto, e o objeto ausente não é erro', async ({
    assert,
  }) => {
    const { storages, bucket, useCase } = await setup()
    await storages.save(pendingFile())
    bucket.discard = async () => {
      throw new Error('objeto não existe')
    }

    const result = await useCase.execute({ id: FILE_ID })

    assert.isTrue(result.isRight())
    assert.isNull(await storages.findById(FILE_ID))
  })

  test('arquivo inexistente é 404 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: FILE_ID })

    assert.deepInclude(result.value, { status: 404, code: 'STORAGE_NOT_FOUND' })
  })
})
