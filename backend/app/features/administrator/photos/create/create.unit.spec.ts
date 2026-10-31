import { test } from '@japa/runner'
import { PHOTO_STATUS, USER_ROLE } from '@interclasse/shared'

import AdministratorPhotoCreateUseCase from './create.use-case.ts'

import { PhotoRepository } from '#repositories/photo/photo.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { memoryAuthor, memoryPhotos, memoryStorage } from '#tests/photos-fixtures'

async function setup(mimetype = 'image/png') {
  const storage = memoryStorage({ mimetype })
  const actor = memoryAuthor(USER_ROLE.ADMINISTRATOR)
  const photos = memoryPhotos(storage, actor)
  const useCase = await makeWithMemory(AdministratorPhotoCreateUseCase, [[PhotoRepository, photos]])

  return { storage, actor, useCase }
}

test.group('administrator/photos > create (unit)', () => {
  test('the organization photo is born approved by whoever submitted it', async ({ assert }) => {
    const { storage, actor, useCase } = await setup()

    const result = await useCase.execute({ storageId: storage.id, caption: 'Final', actor })

    assert.isTrue(result.isRight())
    assert.deepInclude(result.value, {
      status: PHOTO_STATUS.APPROVED,
      reviewedById: actor.id,
      caption: 'Final',
    })
  })

  test('file that is not an image is 422 PHOTO_NOT_IMAGE', async ({ assert }) => {
    const { storage, actor, useCase } = await setup('application/pdf')

    const result = await useCase.execute({ storageId: storage.id, actor })

    assert.deepInclude(result.value, { status: 422, code: 'PHOTO_NOT_IMAGE' })
  })

  test('nonexistent file is 422 STORAGE_NOT_FOUND', async ({ assert }) => {
    const { actor, useCase } = await setup()

    const result = await useCase.execute({
      storageId: '00000000-0000-4000-8000-000000000000',
      actor,
    })

    assert.deepInclude(result.value, { status: 422, code: 'STORAGE_NOT_FOUND' })
  })
})
