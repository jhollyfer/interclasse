import { test } from '@japa/runner'
import { PHOTO_STATUS } from '@interclasse/shared'

import AdvisorPhotoCreateUseCase from './create.use-case.ts'

import { PhotoRepository } from '#repositories/photo/photo.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { memoryAuthor, memoryPhotos, memoryStorage } from '#tests/photos-fixtures'

async function setup(mimetype = 'image/png') {
  const storage = memoryStorage({ mimetype })
  const actor = memoryAuthor()
  const photos = memoryPhotos(storage, actor)
  const useCase = await makeWithMemory(AdvisorPhotoCreateUseCase, [[PhotoRepository, photos]])

  return { storage, actor, useCase }
}

test.group('advisor/photos > create (unit)', () => {
  test('a foto do conselheiro nasce pendente e sem revisão', async ({ assert }) => {
    const { storage, actor, useCase } = await setup()

    const result = await useCase.execute({ storageId: storage.id, actor })

    assert.isTrue(result.isRight())
    assert.deepInclude(result.value, {
      status: PHOTO_STATUS.PENDING,
      reviewedById: null,
      authorId: actor.id,
    })
  })

  test('arquivo que não é imagem é 422 PHOTO_NOT_IMAGE', async ({ assert }) => {
    const { storage, actor, useCase } = await setup('audio/mpeg')

    const result = await useCase.execute({ storageId: storage.id, actor })

    assert.deepInclude(result.value, { status: 422, code: 'PHOTO_NOT_IMAGE' })
  })

  test('arquivo inexistente é 422 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { actor, useCase } = await setup()

    const result = await useCase.execute({
      storageId: '00000000-0000-4000-8000-000000000000',
      actor,
    })

    assert.deepInclude(result.value, { status: 422, code: 'STORAGE_NOT_FOUND' })
  })
})
