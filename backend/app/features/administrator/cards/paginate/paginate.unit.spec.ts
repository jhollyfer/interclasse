import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { CARD_COLOR, MATCH_PHASE } from '@interclasse/shared'

import AdministratorCardPaginateUseCase from './paginate.use-case.ts'

import { MatchCard } from '#domain/match-card/match-card.entity'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = MemoryRepositories.brackets()
  const drawn = await BracketUnitFixtures.drawn(brackets)
  const cards = BracketUnitFixtures.cards(brackets, drawn.students)
  const useCase = await makeWithMemory(
    AdministratorCardPaginateUseCase,
    BracketUnitFixtures.cardBindings(brackets, cards),
  )
  const semi = drawn.bracket.snapshot().matches.find((m) => m.phase === MATCH_PHASE.SEMI)
  const launched = MatchCard.launch({
    id: randomUUID(),
    matchId: semi?.id ?? '',
    studentId: drawn.students[0]?.id ?? '',
    color: CARD_COLOR.YELLOW,
    note: null,
    now: new Date(),
    homeTeamId: semi?.homeTeamId ?? null,
    awayTeamId: semi?.awayTeamId ?? null,
    studentTeamId: semi?.homeTeamId ?? null,
  })
  if (launched.isLeft()) throw new Error('invalid card in the arrangement')
  await cards.save(launched.value)

  return { useCase, card: launched.value, student: drawn.students[0] }
}

test.group('administrator/cards > paginate (unit)', () => {
  test('lists the cards with the athlete, the team and the match', async ({ assert }) => {
    const { useCase, card, student } = await setup()

    const result = await useCase.execute({})

    if (result.isLeft()) throw new Error('list should have come')
    assert.equal(result.value.meta.total, 1)
    assert.equal(result.value.data[0]?.id, card.id)
    assert.equal(result.value.data[0]?.student.name, student?.name)
  })

  test('filters by athlete', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ studentId: randomUUID() })

    if (result.isLeft()) throw new Error('list should have come')
    assert.equal(result.value.meta.total, 0)
  })
})
