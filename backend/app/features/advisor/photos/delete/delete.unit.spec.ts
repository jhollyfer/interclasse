import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { USER_ROLE } from '@interclasse/shared'

import AdvisorPhotoDeleteUseCase from './delete.use-case.ts'

import { Photo, PHOTO_SENDER } from '#domain/photo/photo.entity'
import { PhotoRepository } from '#repositories/photo/photo.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { memoryAuthor, memoryPhotos, memoryStorage } from '#tests/photos-fixtures'

async function setup() {
  const storage = memoryStorage()
  const owner = memoryAuthor()
  const photos = memoryPhotos(storage, owner)
  const created = Photo.create({
    id: randomUUID(),
    storage,
    author: owner,
    sender: PHOTO_SENDER.ADVISOR,
    now: new Date(),
  })
  if (created.isLeft()) throw new Error('invalid arrangement')
  await photos.save(created.value)
  const useCase = await makeWithMemory(AdvisorPhotoDeleteUseCase, [[PhotoRepository, photos]])

  return { photos, photo: created.value, owner, useCase }
}

test.group('advisor/photos > delete (unit)', () => {
  test('the advisor deletes their own photo', async ({ assert }) => {
    const { photos, photo, owner, useCase } = await setup()

    const result = await useCase.execute({ id: photo.id, actor: owner })

    assert.isTrue(result.isRight())
    assert.isNull(await photos.findById(photo.id))
  })

  test('photo from another advisor is 404 and stays', async ({ assert }) => {
    const { photos, photo, useCase } = await setup()

    const result = await useCase.execute({ id: photo.id, actor: memoryAuthor() })

    assert.deepInclude(result.value, { status: 404, code: 'PHOTO_NOT_FOUND' })
    assert.isNotNull(await photos.findById(photo.id))
  })

  test('the administrator deletes any one', async ({ assert }) => {
    const { photos, photo, useCase } = await setup()

    const result = await useCase.execute({
      id: photo.id,
      actor: memoryAuthor(USER_ROLE.ADMINISTRATOR),
    })

    assert.isTrue(result.isRight())
    assert.isNull(await photos.findById(photo.id))
  })
})
