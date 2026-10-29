import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'

import { StorageLucidRepository } from './storage.lucid.repository.ts'
import { StorageMemoryRepository } from './storage.memory.repository.ts'
import type { StorageRepository } from './storage.repository.ts'

import { resetDatabase } from '#tests/http-fixtures'
import { Storage } from '#domain/storage/storage.entity'
import { UserFactory } from '#database/factories/user.factory'
import UserModel from '#models/user'

/**
 * O mesmo contrato nas duas implementações (`_standards/domain.md` §5.4): é o
 * que garante que o unitário do use-case, que roda na de memória, não passa
 * contra um dublê que mente.
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
  if (confirmed) storage.complete({ contentLength: 1024 }, NOW)

  return storage
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`StorageRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save e findById devolvem o mesmo arquivo', async ({ assert }) => {
      const repository = await make()
      const capa = file('4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91', 'capa.png')

      await repository.save(capa)

      const found = await repository.findById(capa.id)
      assert.deepEqual(found?.snapshot(), capa.snapshot())
      assert.isNull(await repository.findById('0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f'))
    })

    test('save de novo atualiza o mesmo arquivo', async ({ assert }) => {
      const repository = await make()
      const capa = file('4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a92', 'capa.png', false)
      await repository.save(capa)

      capa.complete({ contentLength: 1024 }, NOW)
      await repository.save(capa)

      const updated = await repository.findById(capa.id)
      assert.equal(updated?.snapshot().status, 'UPLOADED')
    })

    test('detail traz o registro na forma da resposta, com a url', async ({ assert }) => {
      const repository = await make()
      const capa = file('4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a93', 'capa.png')
      await repository.save(capa)

      const detail = await repository.detail(capa.id)

      assert.deepInclude(detail, { id: capa.id, originalName: 'capa.png', status: 'UPLOADED' })
      assert.isString(detail?.url)
      assert.isNull(await repository.detail('0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f'))
    })

    test('detailsOf traz só os arquivos vivos dos ids', async ({ assert }) => {
      const repository = await make()
      const capa = file('4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a94', 'capa.png')
      await repository.save(capa)

      const details = await repository.detailsOf([
        capa.id,
        capa.id,
        '0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f',
      ])

      assert.deepEqual(
        details.map((item) => item.id),
        [capa.id],
      )
      assert.deepEqual(await repository.detailsOf([]), [])
    })

    test('areAttachable só aceita arquivo confirmado e existente', async ({ assert }) => {
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

    test('paginate busca, filtra por status e ordena', async ({ assert }) => {
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

    test('delete tira o arquivo', async ({ assert }) => {
      const repository = await make()
      const capa = file('5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d', 'capa.png')
      await repository.save(capa)

      await repository.delete(capa)

      assert.isNull(await repository.findById(capa.id))
    })
  })
}

test.group('StorageRepository (lucid) > usedBy', (group) => {
  group.each.setup(() => resetDatabase())

  test('lista o avatar de usuário que aponta para o arquivo', async ({ assert }) => {
    const repository = await app.container.make(StorageLucidRepository)
    const capa = file('6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e', 'avatar.png')
    await repository.save(capa)

    assert.deepEqual(await repository.usedBy(capa.id), [])

    const user = await UserFactory.create()
    await UserModel.query().where('id', user.id).update({ avatarId: capa.id })

    assert.deepEqual(await repository.usedBy(capa.id), ['avatar de usuário'])
  })
})
