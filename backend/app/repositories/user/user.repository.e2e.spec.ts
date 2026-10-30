import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'

import { UserLucidRepository } from './user.lucid.repository.ts'
import { UserMemoryRepository } from './user.memory.repository.ts'
import type { UserRepository } from './user.repository.ts'

import { resetDatabase } from '#tests/http-fixtures'
import { PNG_HEAD } from '#tests/storages-unit-fixtures'
import { Storage } from '#domain/storage/storage.entity'
import { User } from '#domain/user/user.entity'
import { StorageLucidRepository } from '#repositories/storage/storage.lucid.repository'
import { StorageMemoryRepository } from '#repositories/storage/storage.memory.repository'
import type { StorageRepository } from '#repositories/storage/storage.repository'

type Pair = { users: UserRepository; storages: StorageRepository }

/**
 * O mesmo contrato nas duas implementações (`_standards/domain.md` §5.4): é o
 * que garante que o unitário do use-case, que roda na de memória, não passa
 * contra um dublê que mente.
 */
const IMPLEMENTATIONS = {
  lucid: async (): Promise<Pair> => ({
    users: await app.container.make(UserLucidRepository),
    storages: await app.container.make(StorageLucidRepository),
  }),
  memory: async (): Promise<Pair> => {
    const storages = new StorageMemoryRepository()

    return { users: new UserMemoryRepository(storages), storages }
  },
} satisfies Record<string, () => Promise<Pair>>

const NOW = new Date('2026-10-29T12:00:00.000Z')
const ANA = '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91'
const BIA = '5c7a3d2f-4a3b-4d9f-8b2c-1a7e3f8d9b02'
const CAIO = '6d8b4e3a-5b4c-4eaa-9c3d-2b8f4a9eac13'

function account(
  id: string,
  name: string,
  email: string,
  role: 'ADVISOR' | 'ADMINISTRATOR' = 'ADVISOR',
) {
  return User.create({ id, name, email, password: 'Senha@123', role, now: NOW })
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`UserRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save e findById devolvem a mesma conta, com a senha cifrada', async ({ assert }) => {
      const { users } = await make()
      const ana = account(ANA, 'Ana', 'ana@t.dev')

      await users.save(ana)
      const found = await users.findById(ana.id)

      assert.deepEqual({ ...found?.snapshot(), password: '' }, { ...ana.snapshot(), password: '' })
      assert.notEqual(found?.snapshot().password, 'Senha@123')
      assert.isTrue(await hash.verify(found?.snapshot().password ?? '', 'Senha@123'))
      assert.isNull(await users.findById(BIA))
    })

    test('salvar de novo sem trocar a senha não a cifra outra vez', async ({ assert }) => {
      const { users } = await make()
      await users.save(account(ANA, 'Ana', 'ana@t.dev'))
      const first = await users.findById(ANA)
      const stored = first?.snapshot().password ?? ''

      first?.update({ name: 'Ana Maria' }, NOW)
      if (first) await users.save(first)

      const again = await users.findById(ANA)
      assert.equal(again?.snapshot().password, stored)
      assert.equal(again?.snapshot().name, 'Ana Maria')
    })

    test('trocar a senha grava o hash novo', async ({ assert }) => {
      const { users } = await make()
      await users.save(account(ANA, 'Ana', 'ana@t.dev'))
      const ana = await users.findById(ANA)

      ana?.update({ password: 'Nova@12345' }, NOW)
      if (ana) await users.save(ana)

      const changed = await users.findById(ANA)
      const stored = changed?.snapshot().password ?? ''
      assert.isTrue(await hash.verify(stored, 'Nova@12345'))
    })

    test('a conta arquivada some de findById e aparece em findArchivedById e findAnyById', async ({
      assert,
    }) => {
      const { users } = await make()
      const ana = account(ANA, 'Ana', 'ana@t.dev')
      await users.save(ana)
      ana.archive(NOW)
      await users.save(ana)

      assert.isNull(await users.findById(ANA))
      assert.isNotNull(await users.findArchivedById(ANA))
      assert.isNotNull(await users.findAnyById(ANA))
    })

    test('findByEmail e existsByEmail enxergam também a conta arquivada', async ({ assert }) => {
      const { users } = await make()
      const ana = account(ANA, 'Ana', 'ana@t.dev')
      ana.archive(NOW)
      await users.save(ana)

      assert.isNotNull(await users.findByEmail('ana@t.dev'))
      assert.isTrue(await users.existsByEmail('ana@t.dev'))
      assert.isFalse(await users.existsByEmail('ana@t.dev', ANA))
      assert.isNull(await users.findByEmail('outra@t.dev'))
    })

    test('detail traz a conta com o avatar e sem a senha; arquivada é null', async ({ assert }) => {
      const { users, storages } = await make()
      const foto = Storage.open({
        id: CAIO,
        key: 'foto.png',
        originalName: 'foto.png',
        mimetype: 'image/png',
        size: 1,
        uploadId: null,
        partSize: 1,
        now: NOW,
      })
      foto.complete({ contentLength: 1, head: PNG_HEAD }, NOW)
      await storages.save(foto)
      const ana = account(ANA, 'Ana', 'ana@t.dev')
      ana.update({ avatarId: CAIO }, NOW)
      await users.save(ana)
      const bia = account(BIA, 'Bia', 'bia@t.dev')
      bia.archive(NOW)
      await users.save(bia)

      const detail = await users.detail(ANA)

      assert.deepInclude(detail, { id: ANA, name: 'Ana', avatarId: CAIO })
      assert.equal(detail?.avatar?.id, CAIO)
      assert.notProperty(detail, 'password')
      assert.isNull(await users.detail(BIA))
    })

    test('paginate esconde a lixeira, busca por nome e e-mail e filtra por papel', async ({
      assert,
    }) => {
      const { users } = await make()
      await users.save(account(ANA, 'Ana', 'ana@t.dev'))
      await users.save(account(BIA, 'Bia', 'zeta@t.dev', 'ADMINISTRATOR'))
      const caio = account(CAIO, 'Caio', 'caio@t.dev')
      caio.archive(NOW)
      await users.save(caio)
      // O seeder deixa o administrador na tabela: a busca recorta só as contas do teste.
      const base = {
        page: 1,
        perPage: 10,
        search: '@t.dev',
        sort: 'name',
        direction: 'asc',
      } as const

      const living = await users.paginate(base)
      const trash = await users.paginate({ ...base, trashed: 'only' })
      const everyone = await users.paginate({ ...base, trashed: 'with' })
      const byEmail = await users.paginate({ ...base, search: 'ZETA' })
      const admins = await users.paginate({ ...base, role: 'ADMINISTRATOR' })

      assert.deepEqual(
        living.data.map((item) => item.name),
        ['Ana', 'Bia'],
      )
      assert.deepEqual(
        trash.data.map((item) => item.name),
        ['Caio'],
      )
      assert.equal(everyone.meta.total, 3)
      assert.deepEqual(
        byEmail.data.map((item) => item.name),
        ['Bia'],
      )
      assert.deepEqual(
        admins.data.map((item) => item.name),
        ['Bia'],
      )
    })

    test('delete apaga de vez', async ({ assert }) => {
      const { users } = await make()
      const ana = account(ANA, 'Ana', 'ana@t.dev')
      ana.archive(NOW)
      await users.save(ana)

      await users.delete(ana)

      assert.isNull(await users.findAnyById(ANA))
    })
  })
}
