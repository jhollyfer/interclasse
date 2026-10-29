import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import AdministratorPhotoDeleteUseCase from './delete.use-case.ts'

import { Photo, PHOTO_SENDER } from '#domain/photo/photo.entity'
import { PhotoRepository } from '#repositories/photo/photo.repository'
import { makeWithMemory } from '#tests/unit-fixtures'
import { memoryAuthor, memoryPhotos, memoryStorage } from '#tests/photos-fixtures'

async function setup() {
  const storage = memoryStorage()
  const photos = memoryPhotos(storage, memoryAuthor())
  const created = Photo.create({
    id: randomUUID(),
    storage,
    author: { id: randomUUID() },
    sender: PHOTO_SENDER.ADMINISTRATOR,
    now: new Date(),
  })
  if (created.isLeft()) throw new Error('arranjo inválido')
  await photos.save(created.value)
  const useCase = await makeWithMemory(AdministratorPhotoDeleteUseCase, [[PhotoRepository, photos]])

  return { photos, photo: created.value, useCase }
}

test.group('administrator/photos > delete (unit)', () => {
  test('apaga a foto', async ({ assert }) => {
    const { photos, photo, useCase } = await setup()

    const result = await useCase.execute({ id: photo.id })

    assert.isTrue(result.isRight())
    assert.isNull(await photos.findById(photo.id))
  })

  test('inexistente é 404 PHOTO_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000' })

    assert.deepInclude(result.value, { status: 404, code: 'PHOTO_NOT_FOUND' })
  })
})
