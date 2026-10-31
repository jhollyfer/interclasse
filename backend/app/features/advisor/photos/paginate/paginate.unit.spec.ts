import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import AdvisorPhotoPaginateUseCase from './paginate.use-case.ts'

import { Photo, PHOTO_SENDER } from '#domain/photo/photo.entity'
import { PhotoRepository } from '#repositories/photo/photo.repository'
import { makeWithMemory } from '#tests/container-fixtures'
import { memoryAuthor, memoryPhotos, memoryStorage } from '#tests/photos-fixtures'

async function setup() {
  const storage = memoryStorage()
  const mine = memoryAuthor()
  const other = memoryAuthor()
  const photos = memoryPhotos(storage, mine).withAuthor(other)
  for (const author of [mine, other, other]) {
    const created = Photo.create({
      id: randomUUID(),
      storage,
      author,
      sender: PHOTO_SENDER.ADVISOR,
      now: new Date(),
    })
    if (created.isLeft()) throw new Error('invalid arrangement')
    await photos.save(created.value)
  }
  const useCase = await makeWithMemory(AdvisorPhotoPaginateUseCase, [[PhotoRepository, photos]])

  return { mine, useCase }
}

test.group('advisor/photos > paginate (unit)', () => {
  test('lists only the photos of whoever is logged in', async ({ assert }) => {
    const { mine, useCase } = await setup()

    const result = await useCase.execute({ actor: mine })

    assert.isTrue(result.isRight())
    assert.equal(result.isRight() && result.value.meta.total, 1)
    assert.equal(result.isRight() && result.value.data[0]?.authorId, mine.id)
  })
})
