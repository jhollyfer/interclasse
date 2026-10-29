import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { PHOTO_STATUS, UPLOAD_STATUS, USER_ROLE } from '@interclasse/shared'

import { PhotoLucidRepository } from './photo.lucid.repository.ts'
import { PhotoMemoryRepository } from './photo.memory.repository.ts'
import type { PhotoRepository } from './photo.repository.ts'

import { StorageFactory } from '#database/factories/storage.factory'
import { UserFactory } from '#database/factories/user.factory'
import { resetDatabase } from '#tests/http-fixtures'
import { PHOTO_SENDER, Photo } from '#domain/photo/photo.entity'

/**
 * O mesmo contrato nas duas implementações (`_standards/domain.md` §5.4): é o
 * que garante que o unitário do use-case, que roda na de memória, não passa
 * contra um dublê que mente. Cada implementação arranja o próprio arquivo e a
 * própria conta; o resto do teste é igual.
 */
type Arranged = {
  readonly repository: PhotoRepository
  readonly storageId: string
  readonly authorId: string
}

const NOW = new Date('2026-10-29T12:00:00.000Z')

const IMPLEMENTATIONS = {
  lucid: async (): Promise<Arranged> => {
    const storage = await StorageFactory.create()
    const author = await UserFactory.create()

    return {
      repository: await app.container.make(PhotoLucidRepository),
      storageId: storage.id,
      authorId: author.id,
    }
  },
  memory: async (): Promise<Arranged> => {
    const storageId = randomUUID()
    const authorId = randomUUID()
    const repository = new PhotoMemoryRepository()
      .withStorage({
        id: storageId,
        filename: 'a.png',
        originalName: 'a.png',
        mimetype: 'image/png',
        size: 1,
        path: 'a.png',
        status: UPLOAD_STATUS.UPLOADED,
        url: 'http://bucket/a.png',
        createdAt: null,
        updatedAt: null,
        deletedAt: null,
      })
      .withAuthor({ id: authorId, name: 'Ana', email: 'ana@mail.com', role: USER_ROLE.ADVISOR })

    return { repository, storageId, authorId }
  },
} satisfies Record<string, () => Promise<Arranged>>

function photo(
  arranged: Arranged,
  sender: (typeof PHOTO_SENDER)[keyof typeof PHOTO_SENDER],
  now: Date,
) {
  const created = Photo.create({
    id: randomUUID(),
    storage: { id: arranged.storageId, mimetype: 'image/png' },
    caption: 'Final',
    author: { id: arranged.authorId },
    sender,
    now,
  })
  if (created.isLeft()) throw new Error('foto inválida no arranjo')

  return created.value
}

for (const [name, arrange] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`PhotoRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save e findById devolvem a mesma foto', async ({ assert }) => {
      const arranged = await arrange()
      const sent = photo(arranged, PHOTO_SENDER.ADVISOR, NOW)

      await arranged.repository.save(sent)
      const found = await arranged.repository.findById(sent.id)

      assert.deepEqual(found?.snapshot(), sent.snapshot())
    })

    test('findOwned só acha a foto de quem a enviou', async ({ assert }) => {
      const arranged = await arrange()
      const sent = photo(arranged, PHOTO_SENDER.ADVISOR, NOW)
      await arranged.repository.save(sent)

      assert.isNotNull(await arranged.repository.findOwned(sent.id, arranged.authorId))
      assert.isNull(await arranged.repository.findOwned(sent.id, randomUUID()))
    })

    test('findUploadedStorage acha o arquivo enviado e não o inexistente', async ({ assert }) => {
      const arranged = await arrange()

      assert.deepEqual(await arranged.repository.findUploadedStorage(arranged.storageId), {
        id: arranged.storageId,
        mimetype: 'image/png',
      })
      assert.isNull(await arranged.repository.findUploadedStorage(randomUUID()))
    })

    test('show traz o arquivo e quem enviou', async ({ assert }) => {
      const arranged = await arrange()
      const sent = photo(arranged, PHOTO_SENDER.ADVISOR, NOW)
      await arranged.repository.save(sent)

      const shown = await arranged.repository.show(sent.id)

      assert.equal(shown?.storage.id, arranged.storageId)
      assert.equal(shown?.author?.id, arranged.authorId)
      assert.equal(shown?.status, PHOTO_STATUS.PENDING)
      assert.isNull(await arranged.repository.show(randomUUID()))
    })

    test('paginate filtra por status e por autor, da mais nova à mais antiga', async ({
      assert,
    }) => {
      const arranged = await arrange()
      const older = photo(arranged, PHOTO_SENDER.ADVISOR, NOW)
      const newer = photo(arranged, PHOTO_SENDER.ADMINISTRATOR, new Date(NOW.getTime() + 1000))
      await arranged.repository.save(older)
      await arranged.repository.save(newer)

      const all = await arranged.repository.paginate({ page: 1, perPage: 10 })
      const pending = await arranged.repository.paginate({
        page: 1,
        perPage: 10,
        status: PHOTO_STATUS.PENDING,
      })
      const stranger = await arranged.repository.paginate({
        page: 1,
        perPage: 10,
        authorId: randomUUID(),
      })

      assert.deepEqual(
        all.data.map((item) => item.id),
        [newer.id, older.id],
      )
      assert.deepEqual(
        pending.data.map((item) => item.id),
        [older.id],
      )
      assert.lengthOf(stranger.data, 0)
    })

    test('paginateApproved lista só as aprovadas e sem autor', async ({ assert }) => {
      const arranged = await arrange()
      await arranged.repository.save(photo(arranged, PHOTO_SENDER.ADVISOR, NOW))
      const approved = photo(arranged, PHOTO_SENDER.ADMINISTRATOR, NOW)
      await arranged.repository.save(approved)

      const page = await arranged.repository.paginateApproved({ page: 1, perPage: 10 })

      assert.deepEqual(
        page.data.map((item) => item.id),
        [approved.id],
      )
      assert.notProperty(page.data[0] ?? {}, 'authorId')
      assert.isString(page.data[0]?.url)
    })

    test('delete tira a foto', async ({ assert }) => {
      const arranged = await arrange()
      const sent = photo(arranged, PHOTO_SENDER.ADVISOR, NOW)
      await arranged.repository.save(sent)

      await arranged.repository.delete(sent)

      assert.isNull(await arranged.repository.findById(sent.id))
    })
  })
}
