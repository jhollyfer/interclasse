import { test } from '@japa/runner'
import { MATCH_PHASE } from '@interclasse/shared'

import AdministratorMatchPaginateUseCase from './paginate.use-case.ts'

import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = MemoryRepositories.brackets()
  const useCase = await makeWithMemory(
    AdministratorMatchPaginateUseCase,
    BracketUnitFixtures.bindings(brackets),
  )
  const drawn = await BracketUnitFixtures.drawn(brackets)

  return { useCase, ...drawn }
}

test.group('administrator/matches > paginate (unit)', () => {
  test('lists only the matches with both teams defined', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({})

    if (result.isLeft()) throw new Error('list should have come')
    // Two semifinals; the final does not have an opponent yet.
    assert.equal(result.value.meta.total, 2)
    assert.isTrue(result.value.data.every((match) => match.phase === MATCH_PHASE.SEMI))
  })

  test('shows the classroom with only id, name and category', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({})

    if (result.isLeft()) throw new Error('list should have come')
    assert.deepEqual(Object.keys(result.value.data[0]?.homeTeam.classroom ?? {}).sort(), [
      'category',
      'id',
      'name',
    ])
  })

  test('filters by classroom', async ({ assert }) => {
    const { useCase, classrooms } = await setup()

    const result = await useCase.execute({ classroomId: classrooms[0]?.id })

    if (result.isLeft()) throw new Error('list should have come')
    assert.equal(result.value.meta.total, 1)
  })

  test('filters by phase without a ready match', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ phase: MATCH_PHASE.FINAL })

    if (result.isLeft()) throw new Error('list should have come')
    assert.equal(result.value.meta.total, 0)
  })
})
