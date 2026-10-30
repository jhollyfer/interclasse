import { test } from '@japa/runner'
import { MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import StorefrontMatchPaginateUseCase from './paginate.use-case.ts'

import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = MemoryRepositories.brackets()
  const useCase = await makeWithMemory(
    StorefrontMatchPaginateUseCase,
    BracketUnitFixtures.bindings(brackets),
  )
  const { bracket } = await BracketUnitFixtures.drawn(brackets)

  return { brackets, useCase, bracket }
}

test.group('storefront/matches > paginate (unit)', () => {
  test('lista as próximas partidas na ordem da agenda', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ status: MATCH_STATUS.SCHEDULED })

    if (result.isLeft()) throw new Error('lista deveria vir')
    assert.equal(result.value.meta.total, 2)
  })

  test('os resultados vêm do mais recente para trás', async ({ assert }) => {
    const { brackets, useCase, bracket } = await setup()
    const [first, second] = bracket
      .snapshot()
      .matches.filter((match) => match.phase === MATCH_PHASE.SEMI)
    const saved = await brackets.findById(bracket.id)
    saved?.score(first?.id ?? '', { homeScore: 1, awayScore: 0 }, new Date('2026-10-29T13:00:00Z'))
    saved?.score(second?.id ?? '', { homeScore: 1, awayScore: 0 }, new Date('2026-10-29T14:00:00Z'))
    if (saved) await brackets.save(saved)

    const result = await useCase.execute({ status: MATCH_STATUS.FINISHED })

    if (result.isLeft()) throw new Error('lista deveria vir')
    assert.deepEqual(
      result.value.data.map((match) => match.id),
      [second?.id, first?.id],
    )
  })
})
