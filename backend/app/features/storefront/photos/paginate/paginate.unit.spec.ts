import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import StorefrontPhotoPaginateUseCase from './paginate.use-case.ts'

import { Photo, PHOTO_SENDER, type PhotoSender } from '#domain/photo/photo.entity'
import { PhotoRepository } from '#repositories/photo/photo.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { memoryAuthor, memoryPhotos, memoryStorage } from '#tests/photos-fixtures'

async function setup() {
  const storage = memoryStorage()
  const author = memoryAuthor()
  const photos = memoryPhotos(storage, author)
  for (const sender of [PHOTO_SENDER.ADVISOR, PHOTO_SENDER.ADMINISTRATOR] satisfies PhotoSender[]) {
    const created = Photo.create({ id: randomUUID(), storage, author, sender, now: new Date() })
    if (created.isLeft()) throw new Error('arranjo inválido')
    await photos.save(created.value)
  }
  const useCase = await makeWithMemory(StorefrontPhotoPaginateUseCase, [[PhotoRepository, photos]])

  return { storage, useCase }
}

test.group('storefront/photos > paginate (unit)', () => {
  test('lista só as aprovadas, sem autor', async ({ assert }) => {
    const { storage, useCase } = await setup()

    const result = await useCase.execute({})

    if (result.isLeft()) throw new Error('esperava lista')
    const [item] = result.value.data
    assert.lengthOf(result.value.data, 1)
    assert.equal(item?.url, `https://bucket.test/${storage.path}?signed`)
    assert.notProperty(item ?? {}, 'authorId')
  })
})
