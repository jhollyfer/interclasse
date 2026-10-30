import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { PHOTO_STATUS } from '@interclasse/shared'

import AdministratorPhotoPaginateUseCase from './paginate.use-case.ts'

import { Photo, PHOTO_SENDER, type PhotoSender } from '#domain/photo/photo.entity'
import { PhotoRepository } from '#repositories/photo/photo.repository'
import { makeWithMemory } from '#tests/unit-fixtures'
import { memoryAuthor, memoryPhotos, memoryStorage } from '#tests/photos-fixtures'

async function setup() {
  const storage = memoryStorage()
  const author = memoryAuthor()
  const photos = memoryPhotos(storage, author)
  const send = async (sender: PhotoSender) => {
    const created = Photo.create({ id: randomUUID(), storage, author, sender, now: new Date() })
    if (created.isLeft()) throw new Error('arranjo inválido')
    await photos.save(created.value)
  }
  await send(PHOTO_SENDER.ADVISOR)
  await send(PHOTO_SENDER.ADMINISTRATOR)
  const useCase = await makeWithMemory(AdministratorPhotoPaginateUseCase, [
    [PhotoRepository, photos],
  ])

  return { useCase }
}

test.group('administrator/photos > paginate (unit)', () => {
  test('lista todas, com quem enviou', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({})

    assert.isTrue(result.isRight())
    assert.equal(result.isRight() && result.value.meta.total, 2)
    assert.isNotNull(result.isRight() && result.value.data[0]?.author)
  })

  test('?status=PENDING é a fila de revisão', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ status: PHOTO_STATUS.PENDING })

    assert.equal(result.isRight() && result.value.data.length, 1)
  })
})
