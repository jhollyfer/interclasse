import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'

import { AnnouncementLucidRepository } from './announcement.lucid.repository.ts'
import { AnnouncementMemoryRepository } from './announcement.memory.repository.ts'
import type { AnnouncementRepository } from './announcement.repository.ts'

import { resetDatabase } from '#tests/helpers'
import { Announcement } from '#domain/announcement/announcement.entity'

/**
 * O mesmo contrato nas duas implementações (`_standards/domain.md` §5.4): é o
 * que garante que o unitário do use-case, que roda na de memória, não passa
 * contra um dublê que mente.
 */
const IMPLEMENTATIONS = {
  lucid: () => app.container.make(AnnouncementLucidRepository),
  memory: async () => new AnnouncementMemoryRepository(),
} satisfies Record<string, () => Promise<AnnouncementRepository>>

function announcement(input: {
  id: string
  title: string
  pinned?: boolean
  at?: string
}): Announcement {
  return Announcement.create({
    id: input.id,
    title: input.title,
    body: 'Texto do aviso',
    pinned: input.pinned,
    now: new Date(input.at ?? '2026-10-29T12:00:00.000Z'),
  })
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`AnnouncementRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save e findById devolvem o mesmo aviso', async ({ assert }) => {
      const repository = await make()
      const aviso = announcement({ id: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91', title: 'Adiado' })

      await repository.save(aviso)
      const found = await repository.findById(aviso.id)

      assert.deepEqual(found?.snapshot(), aviso.snapshot())
    })

    test('save de aviso existente atualiza em vez de duplicar', async ({ assert }) => {
      const repository = await make()
      const aviso = announcement({ id: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', title: 'Antes' })
      await repository.save(aviso)

      aviso.edit({ title: 'Depois', pinned: true }, new Date('2026-10-30T12:00:00.000Z'))
      await repository.save(aviso)
      const page = await repository.paginate({
        page: 1,
        perPage: 10,
        sort: 'createdAt',
        direction: 'desc',
        pinnedFirst: false,
      })

      assert.equal(page.meta.total, 1)
      assert.deepInclude(page.data[0], { title: 'Depois', pinned: true })
    })

    test('findById de id inexistente é null', async ({ assert }) => {
      const repository = await make()

      assert.isNull(await repository.findById('0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f'))
    })

    test('paginate com fixados primeiro e depois do mais novo', async ({ assert }) => {
      const repository = await make()
      await repository.save(
        announcement({
          id: '1d2c3b4a-5f6e-4d8c-9b0a-1f2e3d4c5b6a',
          title: 'Fixado antigo',
          pinned: true,
          at: '2026-10-26T12:00:00.000Z',
        }),
      )
      await repository.save(
        announcement({
          id: '2e3d4c5b-6a7f-4e9d-8c1b-2a3f4e5d6c7b',
          title: 'Intermediário',
          at: '2026-10-28T12:00:00.000Z',
        }),
      )
      await repository.save(
        announcement({
          id: '3f4e5d6c-7b8a-4f0e-9d2c-3b4a5f6e7d8c',
          title: 'Recente',
          at: '2026-10-29T12:00:00.000Z',
        }),
      )

      const page = await repository.paginate({
        page: 1,
        perPage: 10,
        sort: 'createdAt',
        direction: 'desc',
        pinnedFirst: true,
      })

      assert.deepEqual(
        page.data.map((item) => item.title),
        ['Fixado antigo', 'Recente', 'Intermediário'],
      )
    })

    test('paginate busca pelo título e ordena pela coluna pedida', async ({ assert }) => {
      const repository = await make()
      await repository.save(
        announcement({ id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d', title: 'Jogo da final' }),
      )
      await repository.save(
        announcement({ id: '6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e', title: 'Jogo adiado' }),
      )
      await repository.save(
        announcement({ id: '7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f', title: 'Lanche liberado' }),
      )

      const page = await repository.paginate({
        page: 1,
        perPage: 10,
        search: 'jogo',
        sort: 'title',
        direction: 'asc',
        pinnedFirst: false,
      })

      assert.deepEqual(
        page.data.map((item) => item.title),
        ['Jogo adiado', 'Jogo da final'],
      )
      assert.equal(page.meta.total, 2)
    })

    test('delete tira o aviso', async ({ assert }) => {
      const repository = await make()
      const aviso = announcement({ id: '8d9e0f1a-2b3c-4d4e-9f5a-6b7c8d9e0f1a', title: 'Vencido' })
      await repository.save(aviso)

      await repository.delete(aviso)

      assert.isNull(await repository.findById(aviso.id))
    })
  })
}
