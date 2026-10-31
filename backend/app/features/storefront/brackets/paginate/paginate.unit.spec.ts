import { test } from '@japa/runner'

import StorefrontBracketPaginateUseCase from './paginate.use-case.ts'

import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

test.group('storefront/brackets > paginate (unit)', () => {
  test('lists the brackets by sport name', async ({ assert }) => {
    const brackets = MemoryRepositories.brackets()
    const useCase = await makeWithMemory(
      StorefrontBracketPaginateUseCase,
      BracketUnitFixtures.bindings(brackets),
    )
    await BracketUnitFixtures.drawn(brackets)

    const result = await useCase.execute({})

    assert.isTrue(result.isRight())
    assert.equal(result.isRight() && result.value.meta.total, 1)
  })
})
