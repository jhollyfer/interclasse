import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { CARD_COLOR, CATEGORY, MATCH_PHASE, USER_ROLE } from '@interclasse/shared'

import AdvisorCardPaginateUseCase from './paginate.use-case.ts'

import { MatchCard } from '#domain/match-card/match-card.entity'
import { Classroom } from '#domain/classroom/classroom.entity'
import { BracketMemoryRepository } from '#repositories/bracket/bracket.memory.repository'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { ClassroomMemoryRepository } from '#repositories/classroom/classroom.memory.repository'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

const ADVISOR = { id: randomUUID(), role: USER_ROLE.ADVISOR, avatarId: null }

async function setup() {
  const brackets = new BracketMemoryRepository()
  const drawn = await BracketUnitFixtures.drawn(brackets)
  const cards = BracketUnitFixtures.cards(brackets, drawn.students)
  const classrooms = new ClassroomMemoryRepository()
  const useCase = await makeWithMemory(AdvisorCardPaginateUseCase, [
    ...BracketUnitFixtures.cardBindings(brackets, cards),
    [ClassroomRepository, classrooms],
  ])
  const semi = drawn.bracket.snapshot().matches.find((m) => m.phase === MATCH_PHASE.SEMI)
  const home = drawn.bracket.snapshot().teams.find((team) => team.id === semi?.homeTeamId)
  const student = drawn.students.find((candidate) => candidate.classroomId === home?.classroomId)
  const launched = MatchCard.launch({
    id: randomUUID(),
    matchId: semi?.id ?? '',
    studentId: student?.id ?? '',
    color: CARD_COLOR.RED,
    note: null,
    now: new Date(),
    homeTeamId: semi?.homeTeamId ?? null,
    awayTeamId: semi?.awayTeamId ?? null,
    studentTeamId: semi?.homeTeamId ?? null,
  })
  if (launched.isLeft()) throw new Error('cartão inválido no arranjo')
  await cards.save(launched.value)

  const classroomId = home?.classroomId ?? ''
  // A turma do conselheiro: é por ela que o use-case confere a posse.
  await classrooms.save(
    Classroom.restore({
      id: classroomId,
      name: '9º A',
      grade: 9,
      category: CATEGORY.F2,
      advisorId: ADVISOR.id,
      representativeId: null,
      createdAt: new Date(),
      updatedAt: null,
    }),
  )

  return { useCase, card: launched.value, classroomId }
}

test.group('advisor/cards > paginate (unit)', () => {
  test('lista só os cartões dos atletas da turma', async ({ assert }) => {
    const { useCase, card, classroomId } = await setup()

    const result = await useCase.execute({ classroomId, actor: ADVISOR })

    if (result.isLeft()) throw new Error('lista deveria vir')
    assert.deepEqual(
      result.value.data.map((item) => item.id),
      [card.id],
    )
  })

  test('turma alheia é 404 como a inexistente', async ({ assert }) => {
    const { useCase, classroomId } = await setup()

    const other = await useCase.execute({
      classroomId,
      actor: { id: randomUUID(), role: USER_ROLE.ADVISOR, avatarId: null },
    })
    const missing = await useCase.execute({ classroomId: randomUUID(), actor: ADVISOR })

    assert.deepInclude(other.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
    assert.deepInclude(missing.value, { status: 404, code: 'CLASSROOM_NOT_FOUND' })
  })
})
