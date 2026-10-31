import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'

import { StorageLucidRepository } from './storage.lucid.repository.ts'
import { StorageMemoryRepository } from './storage.memory.repository.ts'
import type { StorageRepository } from './storage.repository.ts'

import { resetDatabase } from '#tests/http-fixtures'
import { PNG_HEAD } from '#tests/storages-unit-fixtures'
import { Storage } from '#domain/storage/storage.entity'
import { UserFactory } from '#database/factories/user.factory'
import UserModel from '#models/user'

/**
 * The same contract in both implementations (`_standards/domain.md` §5.4): it is what
 * guarantees that the use case unit test, which runs on the in-memory one, does not pass
 * against a lying double.
 */
const IMPLEMENTATIONS = {
  lucid: () => app.container.make(StorageLucidRepository),
  memory: async () => new StorageMemoryRepository(),
} satisfies Record<string, () => Promise<StorageRepository>>

const NOW = new Date('2026-10-29T12:00:00.000Z')

function file(id: string, originalName: string, confirmed = true): Storage {
  const storage = Storage.open({
    id,
    key: `${id}.png`,
    originalName,
    mimetype: 'image/png',
    size: 1024,
    uploadId: null,
    partSize: 10,
    now: NOW,
  })
  if (confirmed) storage.complete({ contentLength: 1024, head: PNG_HEAD }, NOW)

  return storage
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`StorageRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save and findById return the same file', async ({ assert }) => {
      const repository = await make()
      const cover = file('4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91', 'cover.png')

      await repository.save(cover)

      const found = await repository.findById(cover.id)
      assert.deepEqual(found?.snapshot(), cover.snapshot())
      assert.isNull(await repository.findById('0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f'))
    })

    test('saving again updates the same file', async ({ assert }) => {
      const repository = await make()
      const cover = file('4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a92', 'cover.png', false)
      await repository.save(cover)

      cover.complete({ contentLength: 1024, head: PNG_HEAD }, NOW)
      await repository.save(cover)

      const updated = await repository.findById(cover.id)
      assert.equal(updated?.snapshot().status, 'UPLOADED')
    })

    test('detail brings the record in the response shape, without the url', async ({ assert }) => {
      const repository = await make()
      const cover = file('4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a93', 'cover.png')
      await repository.save(cover)

      const detail = await repository.detail(cover.id)

      assert.deepInclude(detail, { id: cover.id, originalName: 'cover.png', status: 'UPLOADED' })
      assert.notProperty(detail, 'url')
      assert.isNull(await repository.detail('0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f'))
    })

    test('detailsOf brings only the live files of the ids', async ({ assert }) => {
      const repository = await make()
      const cover = file('4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a94', 'cover.png')
      await repository.save(cover)

      const details = await repository.detailsOf([
        cover.id,
        cover.id,
        '0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f',
      ])

      assert.deepEqual(
        details.map((item) => item.id),
        [cover.id],
      )
      assert.deepEqual(await repository.detailsOf([]), [])
    })

    test('areAttachable only accepts a confirmed and existing file', async ({ assert }) => {
      const repository = await make()
      const ok = file('7e1d3c2b-1a0f-4e9d-8c7b-6a5f4e3d2c11', 'ok.png')
      const pending = file('7e1d3c2b-1a0f-4e9d-8c7b-6a5f4e3d2c12', 'pendente.png', false)
      await repository.save(ok)
      await repository.save(pending)

      assert.isTrue(await repository.areAttachable([ok.id, ok.id]))
      assert.isTrue(await repository.areAttachable([]))
      assert.isFalse(await repository.areAttachable([ok.id, pending.id]))
      assert.isFalse(await repository.areAttachable(['0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f']))
    })

    test('paginate searches, filters by status and sorts', async ({ assert }) => {
      const repository = await make()
      await repository.save(file('1d2c3b4a-5f6e-4d8c-9b0a-1f2e3d4c5b61', 'zeta.png'))
      await repository.save(file('2e3d4c5b-6a7f-4e9d-8c1b-2a3f4e5d6c72', 'alfa.png'))
      await repository.save(file('3f4e5d6c-7b8a-4f0e-9d2c-3b4a5f6e7d83', 'beta.png', false))

      const page = await repository.paginate({
        page: 1,
        perPage: 10,
        status: 'UPLOADED',
        sort: 'originalName',
        direction: 'asc',
      })
      const found = await repository.paginate({
        page: 1,
        perPage: 10,
        search: 'BET',
        sort: 'createdAt',
        direction: 'desc',
      })

      assert.deepEqual(
        page.data.map((item) => item.originalName),
        ['alfa.png', 'zeta.png'],
      )
      assert.equal(page.meta.total, 2)
      assert.deepEqual(
        found.data.map((item) => item.originalName),
        ['beta.png'],
      )
    })

    test('delete removes the file', async ({ assert }) => {
      const repository = await make()
      const cover = file('5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d', 'cover.png')
      await repository.save(cover)

      await repository.delete(cover)

      assert.isNull(await repository.findById(cover.id))
    })
  })
}

test.group('StorageRepository (lucid) > usedBy', (group) => {
  group.each.setup(() => resetDatabase())

  test('lists the user avatar that points to the file', async ({ assert }) => {
    const repository = await app.container.make(StorageLucidRepository)
    const cover = file('6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e', 'avatar.png')
    await repository.save(cover)

    assert.deepEqual(await repository.usedBy(cover.id), [])

    const user = await UserFactory.create()
    await UserModel.query().where('id', user.id).update({ avatarId: cover.id })

    assert.deepEqual(await repository.usedBy(cover.id), ['avatar de usuário'])
  })
})
