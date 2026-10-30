import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { USER_ROLE } from '@interclasse/shared'

import { StudentLucidRepository } from './student.lucid.repository.ts'
import { StudentMemoryRepository } from './student.memory.repository.ts'
import type { StudentRepository } from './student.repository.ts'

import { resetDatabase } from '#tests/http-fixtures'
import ClassroomModel from '#models/classroom'
import { Student } from '#domain/student/student.entity'
import { BracketFactory } from '#database/factories/bracket.factory'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'
import { UserFactory } from '#database/factories/user.factory'

/**
 * O que cada implementação precisa para o teste arranjar o mundo: um conselheiro
 * com turma e um aluno inscrito numa modalidade já sorteada. O contrato roda
 * igual nas duas (`_standards/domain.md` §5.4).
 */
type Harness = {
  readonly repository: StudentRepository
  /** Uma turma e o conselheiro dela. */
  classroom(): Promise<{ classroomId: string; advisorId: string }>
  drawn(student: Student, classroomId: string): Promise<void>
}

const IMPLEMENTATIONS = {
  lucid: async (): Promise<Harness> => ({
    repository: await app.container.make(StudentLucidRepository),
    async classroom() {
      const advisor = await UserFactory.create()
      const classroom = await ClassroomFactory.merge({ advisorId: advisor.id }).create()
      return { classroomId: classroom.id, advisorId: advisor.id }
    },
    async drawn(student, classroomId) {
      const classroom = await ClassroomModel.findOrFail(classroomId)
      const bracket = await BracketFactory.with('sport')
        .merge({ category: classroom.category })
        .create()
      await EnrollmentFactory.merge({ studentId: student.id, sportId: bracket.sportId }).create()
    },
  }),
  memory: async (): Promise<Harness> => {
    const repository = new StudentMemoryRepository()

    return {
      repository,
      async classroom() {
        const classroomId = randomUUID()
        const advisorId = randomUUID()
        repository.withClassroom(classroomId, advisorId)
        return { classroomId, advisorId }
      },
      async drawn(student) {
        repository.markInDrawnSport(student.id)
      },
    }
  },
} satisfies Record<string, () => Promise<Harness>>

const NOW = new Date('2026-10-29T12:00:00.000Z')

function newStudent(classroomId: string, name: string): Student {
  const created = Student.create({ id: randomUUID(), classroomId, name, now: NOW })
  if (created.isLeft()) throw new Error('aluno inválido no arranjo')

  return created.value
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`StudentRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save e findOwned devolvem o mesmo aluno', async ({ assert }) => {
      const { repository, classroom } = await make()
      const { classroomId, advisorId } = await classroom()
      const ana = newStudent(classroomId, 'Ana')

      await repository.save(ana)
      const found = await repository.findOwned({
        id: ana.id,
        actor: { id: advisorId, role: USER_ROLE.ADVISOR, avatarId: null },
      })

      assert.deepEqual(found?.snapshot(), ana.snapshot())
    })

    test('findOwned: aluno de turma alheia volta null, e o administrador alcança', async ({
      assert,
    }) => {
      const { repository, classroom } = await make()
      const { classroomId } = await classroom()
      const stranger = await classroom()
      const ana = newStudent(classroomId, 'Ana')
      await repository.save(ana)

      const denied = await repository.findOwned({
        id: ana.id,
        actor: { id: stranger.advisorId, role: USER_ROLE.ADVISOR, avatarId: null },
      })
      const administrator = await repository.findOwned({
        id: ana.id,
        actor: { id: randomUUID(), role: USER_ROLE.ADMINISTRATOR, avatarId: null },
      })

      assert.isNull(denied)
      assert.isNotNull(administrator)
    })

    test('save de aluno existente atualiza o nome', async ({ assert }) => {
      const { repository, classroom } = await make()
      const { classroomId, advisorId } = await classroom()
      const ana = newStudent(classroomId, 'Ana')
      await repository.save(ana)
      ana.rename('Ana Clara', NOW)

      await repository.save(ana)

      const found = await repository.findOwned({
        id: ana.id,
        actor: { id: advisorId, role: USER_ROLE.ADVISOR, avatarId: null },
      })
      assert.equal(found?.snapshot().name, 'Ana Clara')
    })

    test('isInDrawnSport só é verdade com inscrição em modalidade sorteada', async ({ assert }) => {
      const { repository, classroom, drawn } = await make()
      const { classroomId } = await classroom()
      const ana = newStudent(classroomId, 'Ana')
      await repository.save(ana)

      assert.isFalse(await repository.isInDrawnSport(ana.id))
      await drawn(ana, classroomId)
      assert.isTrue(await repository.isInDrawnSport(ana.id))
    })

    test('delete tira o aluno', async ({ assert }) => {
      const { repository, classroom } = await make()
      const { classroomId, advisorId } = await classroom()
      const ana = newStudent(classroomId, 'Ana')
      await repository.save(ana)

      await repository.delete(ana)

      const found = await repository.findOwned({
        id: ana.id,
        actor: { id: advisorId, role: USER_ROLE.ADVISOR, avatarId: null },
      })
      assert.isNull(found)
    })

    test('paginate lista só o alcance, em ordem alfabética, com busca e recorte de turma', async ({
      assert,
    }) => {
      const { repository, classroom } = await make()
      const own = await classroom()
      const stranger = await classroom()
      await repository.save(newStudent(own.classroomId, 'Bia'))
      await repository.save(newStudent(own.classroomId, 'Ana'))
      await repository.save(newStudent(stranger.classroomId, 'Caio'))
      const actor = { id: own.advisorId, role: USER_ROLE.ADVISOR, avatarId: null }

      const mine = await repository.paginate({ page: 1, perPage: 10, actor })
      const searched = await repository.paginate({ page: 1, perPage: 10, search: 'bi', actor })
      const foreignClassroom = await repository.paginate({
        page: 1,
        perPage: 10,
        classroomId: stranger.classroomId,
        actor,
      })
      const all = await repository.paginate({
        page: 1,
        perPage: 10,
        actor: { id: randomUUID(), role: USER_ROLE.ADMINISTRATOR, avatarId: null },
      })

      assert.deepEqual(
        mine.data.map((item) => item.name),
        ['Ana', 'Bia'],
      )
      assert.deepEqual(
        searched.data.map((item) => item.name),
        ['Bia'],
      )
      assert.equal(foreignClassroom.meta.total, 0)
      assert.equal(all.meta.total, 3)
    })
  })
}
