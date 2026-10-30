import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { PHOTO_STATUS, USER_ROLE } from '@interclasse/shared'

import AdministratorPhotoReviewUseCase from './review.use-case.ts'

import { Photo, PHOTO_SENDER } from '#domain/photo/photo.entity'
import { PhotoRepository } from '#repositories/photo/photo.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { memoryAuthor, memoryPhotos, memoryStorage } from '#tests/photos-fixtures'

async function setup() {
  const storage = memoryStorage()
  const advisor = memoryAuthor()
  const admin = memoryAuthor(USER_ROLE.ADMINISTRATOR)
  const photos = memoryPhotos(storage, advisor)
  const created = Photo.create({
    id: randomUUID(),
    storage,
    author: advisor,
    sender: PHOTO_SENDER.ADVISOR,
    now: new Date(),
  })
  if (created.isLeft()) throw new Error('arranjo inválido')
  await photos.save(created.value)
  const useCase = await makeWithMemory(AdministratorPhotoReviewUseCase, [[PhotoRepository, photos]])

  return { photo: created.value, admin, useCase }
}

test.group('administrator/photos > review (unit)', () => {
  test('aprova e depois recusa: a decisão se refaz', async ({ assert }) => {
    const { photo, admin, useCase } = await setup()

    const approved = await useCase.execute({
      id: photo.id,
      status: PHOTO_STATUS.APPROVED,
      actor: admin,
    })
    const rejected = await useCase.execute({
      id: photo.id,
      status: PHOTO_STATUS.REJECTED,
      actor: admin,
    })

    assert.deepInclude(approved.value, { status: PHOTO_STATUS.APPROVED, reviewedById: admin.id })
    assert.deepInclude(rejected.value, { status: PHOTO_STATUS.REJECTED })
  })

  test('foto inexistente é 404 PHOTO_NOT_FOUND', async ({ assert }) => {
    const { admin, useCase } = await setup()

    const result = await useCase.execute({
      id: '00000000-0000-4000-8000-000000000000',
      status: PHOTO_STATUS.APPROVED,
      actor: admin,
    })

    assert.deepInclude(result.value, { status: 404, code: 'PHOTO_NOT_FOUND' })
  })
})
