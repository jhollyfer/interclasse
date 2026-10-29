import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { CARD_COLOR, MATCH_PHASE } from '@interclasse/shared'

import AdvisorCardPaginateUseCase from './paginate.use-case.ts'

import { MatchCard } from '#domain/match-card/match-card.entity'
import { BracketMemoryRepository } from '#repositories/bracket/bracket.memory.repository'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/unit-fixtures'

async function setup() {
  const brackets = new BracketMemoryRepository()
  const drawn = await BracketUnitFixtures.drawn(brackets)
  const cards = BracketUnitFixtures.cards(brackets, drawn.students)
  const useCase = await makeWithMemory(
    AdvisorCardPaginateUseCase,
    BracketUnitFixtures.cardBindings(brackets, cards),
  )
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

  return { useCase, card: launched.value, classroomId: home?.classroomId ?? '' }
}

test.group('advisor/cards > paginate (unit)', () => {
  test('lista só os cartões dos atletas da turma', async ({ assert }) => {
    const { useCase, card, classroomId } = await setup()

    const result = await useCase.execute({ classroomId })

    if (result.isLeft()) throw new Error('lista deveria vir')
    assert.deepEqual(
      result.value.data.map((item) => item.id),
      [card.id],
    )
  })

  test('turma sem cartão devolve a lista vazia', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ classroomId: randomUUID() })

    if (result.isLeft()) throw new Error('lista deveria vir')
    assert.equal(result.value.meta.total, 0)
  })
})
