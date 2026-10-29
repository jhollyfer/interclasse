import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { USER_ROLE, type UserRole } from '@interclasse/shared'

import { ClassroomLucidRepository } from './classroom.lucid.repository.ts'
import { ClassroomMemoryRepository } from './classroom.memory.repository.ts'
import type { ClassroomRepository } from './classroom.repository.ts'

import { resetDatabase } from '#tests/helpers'
import { Classroom } from '#domain/classroom/classroom.entity'
import { BracketFactory } from '#database/factories/bracket.factory'
import { TeamFactory } from '#database/factories/team.factory'
import { UserFactory } from '#database/factories/user.factory'

/**
 * O que cada implementação precisa para o teste arranjar o mundo: contas com
 * papel e uma turma com time numa chave. O contrato roda igual nas duas
 * (`_standards/domain.md` §5.4).
 */
type Harness = {
  readonly repository: ClassroomRepository
  account(role: UserRole): Promise<string>
  compete(classroomId: string): Promise<void>
}

const IMPLEMENTATIONS = {
  lucid: async (): Promise<Harness> => ({
    repository: await app.container.make(ClassroomLucidRepository),
    async account(role) {
      const user = await UserFactory.merge({ role }).create()
      return user.id
    },
    async compete(classroomId) {
      const bracket = await BracketFactory.with('sport').create()
      await TeamFactory.merge({ bracketId: bracket.id, classroomId }).create()
    },
  }),
  memory: async (): Promise<Harness> => {
    const repository = new ClassroomMemoryRepository()

    return {
      repository,
      async account(role) {
        const id = randomUUID()
        repository.withAccount({
          id,
          name: 'Conta',
          email: `${id}@mail.com`,
          role,
          status: 'ACTIVE',
          avatarId: null,
          createdAt: '2026-10-29T12:00:00.000Z',
          updatedAt: null,
          deletedAt: null,
        })
        return id
      },
      async compete(classroomId) {
        repository.markInCompetition(classroomId)
      },
    }
  },
} satisfies Record<string, () => Promise<Harness>>

const NOW = new Date('2026-10-29T12:00:00.000Z')

async function born(
  repository: ClassroomRepository,
  name: string,
  grade: number,
  links: { advisorId?: string; representativeId?: string } = {},
): Promise<Classroom> {
  const facts = await repository.peopleFacts(links)
  const created = Classroom.create({ id: randomUUID(), name, grade, ...links, now: NOW }, facts)
  if (created.isLeft()) throw new Error('turma inválida no arranjo')
  await repository.save(created.value)

  return created.value
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`ClassroomRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save e findById devolvem a mesma turma', async ({ assert }) => {
      const { repository } = await make()
      const classroom = await born(repository, '7º A', 7)

      const found = await repository.findById(classroom.id)

      assert.deepEqual(found?.snapshot(), classroom.snapshot())
    })

    test('findById de id inexistente é null', async ({ assert }) => {
      const { repository } = await make()

      assert.isNull(await repository.findById('0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f'))
    })

    test('save de turma existente atualiza em vez de duplicar', async ({ assert }) => {
      const { repository } = await make()
      const classroom = await born(repository, '7º A', 7)
      classroom.update({ name: '7º B' }, { facts: {}, inCompetition: false, now: NOW })

      await repository.save(classroom)

      const found = await repository.findById(classroom.id)
      const listed = await repository.paginate(criteria())
      assert.equal(found?.snapshot().name, '7º B')
      assert.equal(listed.meta.total, 1)
    })

    test('findOwned: o administrador alcança todas, o conselheiro só a dele', async ({
      assert,
    }) => {
      const { repository, account } = await make()
      const advisorId = await account(USER_ROLE.ADVISOR)
      const own = await born(repository, '7º A', 7, { advisorId })
      const foreign = await born(repository, '8º A', 8)
      const advisor = { id: advisorId, role: USER_ROLE.ADVISOR }
      const administrator = { id: randomUUID(), role: USER_ROLE.ADMINISTRATOR }

      assert.isNotNull(await repository.findOwned({ id: own.id, actor: advisor }))
      assert.isNull(await repository.findOwned({ id: foreign.id, actor: advisor }))
      assert.isNotNull(await repository.findOwned({ id: foreign.id, actor: administrator }))
    })

    test('findOfRepresentative acha a turma da conta', async ({ assert }) => {
      const { repository, account } = await make()
      const representativeId = await account(USER_ROLE.REPRESENTATIVE)
      const own = await born(repository, '7º A', 7, { representativeId })

      const found = await repository.findOfRepresentative(representativeId)

      assert.equal(found?.id, own.id)
      assert.isNull(await repository.findOfRepresentative(await account(USER_ROLE.REPRESENTATIVE)))
    })

    test('existsByName acha pelo nome, menos a própria', async ({ assert }) => {
      const { repository } = await make()
      const classroom = await born(repository, '7º A', 7)

      assert.isTrue(await repository.existsByName('7º A'))
      assert.isFalse(await repository.existsByName('7º A', classroom.id))
      assert.isFalse(await repository.existsByName('7º B'))
    })

    test('peopleFacts: papel certo existe, papel errado não, e turma alheia ocupa', async ({
      assert,
    }) => {
      const { repository, account } = await make()
      const advisorId = await account(USER_ROLE.ADVISOR)
      const representativeId = await account(USER_ROLE.REPRESENTATIVE)
      const own = await born(repository, '7º A', 7, { advisorId })

      const facts = await repository.peopleFacts({ advisorId, representativeId: advisorId })
      const free = await repository.peopleFacts({ representativeId })
      const ignoringOwn = await repository.peopleFacts({ advisorId }, own.id)

      assert.deepEqual(facts.advisor, { exists: true, taken: true })
      assert.deepEqual(facts.representative, { exists: false, taken: false })
      assert.deepEqual(free.representative, { exists: true, taken: false })
      assert.deepEqual(ignoringOwn.advisor, { exists: true, taken: false })
      assert.deepEqual(await repository.peopleFacts({}), {})
    })

    test('isInCompetition só é verdade com time numa chave', async ({ assert }) => {
      const { repository, compete } = await make()
      const classroom = await born(repository, '7º A', 7)

      assert.isFalse(await repository.isInCompetition(classroom.id))
      await compete(classroom.id)
      assert.isTrue(await repository.isInCompetition(classroom.id))
    })

    test('delete tira a turma', async ({ assert }) => {
      const { repository } = await make()
      const classroom = await born(repository, '7º A', 7)

      await repository.delete(classroom)

      assert.isNull(await repository.findById(classroom.id))
    })

    test('detachAccount desfaz os dois vínculos da conta e só os dela', async ({ assert }) => {
      const { repository, account } = await make()
      const advisorId = await account(USER_ROLE.ADVISOR)
      const other = await account(USER_ROLE.ADVISOR)
      const linked = await born(repository, '7º A', 7, { advisorId })
      const kept = await born(repository, '8º A', 8, { advisorId: other })

      await repository.detachAccount(advisorId)

      const detached = await repository.findById(linked.id)
      const untouched = await repository.findById(kept.id)
      assert.isNull(detached?.snapshot().advisorId)
      assert.equal(untouched?.snapshot().advisorId, other)
    })

    test('findDetail traz conselheiro e representante aninhados', async ({ assert }) => {
      const { repository, account } = await make()
      const advisorId = await account(USER_ROLE.ADVISOR)
      const classroom = await born(repository, '7º A', 7, { advisorId })

      const detail = await repository.findDetail(classroom.id)

      assert.equal(detail?.advisor?.id, advisorId)
      assert.isNull(detail?.representative)
      assert.isNull(await repository.findDetail('0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f'))
    })

    test('paginate filtra por categoria e nome, ordena e traz os totais', async ({ assert }) => {
      const { repository } = await make()
      await born(repository, '4º A', 4)
      await born(repository, '9º A', 9)
      await born(repository, '9º B', 9)

      const f2 = await repository.paginate({
        ...criteria(),
        category: 'F2',
        sort: 'name',
        direction: 'desc',
      })
      const found = await repository.paginate({ ...criteria(), search: '4º' })

      assert.deepEqual(
        f2.data.map((item) => item.name),
        ['9º B', '9º A'],
      )
      assert.deepInclude(f2.data[0], { studentsCount: 0, athletesCount: 0, sportsCount: 0 })
      assert.equal(found.meta.total, 1)
    })

    test('paginateOwned: o conselheiro lista só as dele, em ordem de nome', async ({ assert }) => {
      const { repository, account } = await make()
      const advisorId = await account(USER_ROLE.ADVISOR)
      await born(repository, '9º A', 9, { advisorId })
      await born(repository, '8º A', 8)

      const own = await repository.paginateOwned({
        page: 1,
        perPage: 10,
        actor: { id: advisorId, role: USER_ROLE.ADVISOR },
      })
      const all = await repository.paginateOwned({
        page: 1,
        perPage: 10,
        actor: { id: randomUUID(), role: USER_ROLE.ADMINISTRATOR },
      })

      assert.deepEqual(
        own.data.map((item) => item.name),
        ['9º A'],
      )
      assert.deepEqual(
        all.data.map((item) => item.name),
        ['8º A', '9º A'],
      )
    })
  })
}

function criteria() {
  return { page: 1, perPage: 10, sort: 'name', direction: 'asc' } as const
}
