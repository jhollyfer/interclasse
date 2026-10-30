import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { USER_ROLE } from '@interclasse/shared'

import { EnrollmentRemovalLucidRepository } from './enrollment-removal.lucid.repository.ts'
import { EnrollmentRemovalMemoryRepository } from './enrollment-removal.memory.repository.ts'
import type { EnrollmentRemovalRepository } from './enrollment-removal.repository.ts'

import { resetDatabase } from '#tests/http-fixtures'
import { EnrollmentRemoval } from '#domain/enrollment-removal/enrollment-removal.entity'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { UserFactory } from '#database/factories/user.factory'

type World = { classroomId: string; sportId: string; studentId: string; actorId: string }

/**
 * O que cada implementação precisa para o teste arranjar o mundo do aviso: turma,
 * modalidade, aluno e quem tirou. O contrato roda igual nas duas
 * (`_standards/domain.md` §5.4).
 */
type Harness = {
  readonly repository: EnrollmentRemovalRepository
  world(): Promise<World>
}

const NOW = new Date('2026-10-29T12:00:00.000Z')
const ISO = '2026-10-29T12:00:00.000Z'

const IMPLEMENTATIONS = {
  lucid: async (): Promise<Harness> => ({
    repository: await app.container.make(EnrollmentRemovalLucidRepository),
    async world() {
      const classroom = await ClassroomFactory.create()
      const sport = await SportFactory.create()
      const student = await StudentFactory.merge({ classroomId: classroom.id }).create()
      const actor = await UserFactory.create()

      return {
        classroomId: classroom.id,
        sportId: sport.id,
        studentId: student.id,
        actorId: actor.id,
      }
    },
  }),
  memory: async (): Promise<Harness> => {
    const repository = new EnrollmentRemovalMemoryRepository()

    return {
      repository,
      async world() {
        const world = {
          classroomId: randomUUID(),
          sportId: randomUUID(),
          studentId: randomUUID(),
          actorId: randomUUID(),
        }
        repository
          .withClassroom({
            id: world.classroomId,
            name: '7º A',
            grade: 7,
            category: 'F2',
            advisorId: null,
            representativeId: null,
            createdAt: ISO,
            updatedAt: null,
          })
          .withSport({
            id: world.sportId,
            name: 'Futsal',
            slug: 'futsal',
            minAthletes: 5,
            maxAthletes: 12,
            createdAt: ISO,
            updatedAt: null,
          })
          .withActor({
            id: world.actorId,
            name: 'Conselheiro',
            email: 'c@mail.com',
            role: 'ADVISOR',
            status: 'ACTIVE',
            avatarId: null,
            createdAt: ISO,
            updatedAt: null,
            deletedAt: null,
          })

        return world
      },
    }
  },
} satisfies Record<string, () => Promise<Harness>>

function removal(world: World, at: Date, role: 'ADVISOR' | 'ADMINISTRATOR' = USER_ROLE.ADVISOR) {
  return EnrollmentRemoval.record({
    id: randomUUID(),
    classroomId: world.classroomId,
    sportId: world.sportId,
    studentId: world.studentId,
    studentName: 'Ana',
    reason: 'Mudou de turno',
    actorId: world.actorId,
    actorRole: role,
    now: at,
  })
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`EnrollmentRemovalRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save e findById devolvem o mesmo aviso', async ({ assert }) => {
      const { repository, world } = await make()
      const saved = removal(await world(), NOW)

      await repository.save(saved)
      const found = await repository.findById(saved.id)

      assert.deepEqual(found?.snapshot(), saved.snapshot())
      assert.isNull(await repository.findById(randomUUID()))
    })

    test('saveAll grava todos os avisos da troca; lista vazia não faz nada', async ({ assert }) => {
      const { repository, world } = await make()
      const data = await world()
      const first = removal(data, NOW)
      const second = removal(data, NOW)

      await repository.saveAll([])
      await repository.saveAll([first, second])

      assert.isNotNull(await repository.findById(first.id))
      assert.isNotNull(await repository.findById(second.id))
    })

    test('save de aviso existente grava a ciência', async ({ assert }) => {
      const { repository, world } = await make()
      const saved = removal(await world(), NOW)
      await repository.save(saved)
      saved.acknowledge(new Date('2026-10-30T12:00:00.000Z'))

      await repository.save(saved)

      const found = await repository.findById(saved.id)
      assert.isNotNull(found?.snapshot().acknowledgedAt)
    })

    test('findDetail traz turma, modalidade e quem tirou', async ({ assert }) => {
      const { repository, world } = await make()
      const data = await world()
      const saved = removal(data, NOW)
      await repository.save(saved)

      const detail = await repository.findDetail(saved.id)

      assert.equal(detail?.classroom.id, data.classroomId)
      assert.equal(detail?.sport.id, data.sportId)
      assert.equal(detail?.actor?.id, data.actorId)
      assert.isNull(detail?.acknowledgedAt)
      assert.isNull(await repository.findDetail(randomUUID()))
    })

    test('paginate: pendentes primeiro, depois do mais novo ao mais antigo, com filtros', async ({
      assert,
    }) => {
      const { repository, world } = await make()
      const data = await world()
      const readOld = removal(data, new Date('2026-10-01T12:00:00Z'), USER_ROLE.ADMINISTRATOR)
      const pendingOld = removal(data, new Date('2026-10-02T12:00:00Z'))
      const pendingNew = removal(data, new Date('2026-10-03T12:00:00Z'))
      for (const item of [readOld, pendingOld, pendingNew]) await repository.save(item)

      const all = await repository.paginate({ page: 1, perPage: 10 })
      const pending = await repository.paginate({ page: 1, perPage: 10, pending: true })
      const read = await repository.paginate({ page: 1, perPage: 10, pending: false })
      const other = await repository.paginate({ page: 1, perPage: 10, classroomId: randomUUID() })

      assert.deepEqual(
        all.data.map((item) => item.id),
        [pendingNew.id, pendingOld.id, readOld.id],
      )
      assert.equal(pending.meta.total, 2)
      assert.deepEqual(
        read.data.map((item) => item.id),
        [readOld.id],
      )
      assert.equal(other.meta.total, 0)
    })
  })
}
