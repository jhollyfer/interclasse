import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { CARD_COLOR, MATCH_PHASE } from '@interclasse/shared'

import AdministratorCardDeleteUseCase from './delete.use-case.ts'

import { MatchCard } from '#domain/match-card/match-card.entity'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = MemoryRepositories.brackets()
  const drawn = await BracketUnitFixtures.drawn(brackets)
  const cards = BracketUnitFixtures.cards(brackets, drawn.students)
  const useCase = await makeWithMemory(
    AdministratorCardDeleteUseCase,
    BracketUnitFixtures.cardBindings(brackets, cards),
  )

  return { cards, useCase, drawn }
}

test.group('administrator/cards > delete (unit)', () => {
  test('deletes the card', async ({ assert }) => {
    const { cards, useCase, drawn } = await setup()
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

    const result = await useCase.execute({ id: launched.value.id })

    assert.isTrue(result.isRight())
    assert.isNull(await cards.findById(launched.value.id))
  })

  test('nonexistent card is 404 CARD_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: randomUUID() })

    assert.deepInclude(result.value, { status: 404, code: 'CARD_NOT_FOUND' })
  })
})
