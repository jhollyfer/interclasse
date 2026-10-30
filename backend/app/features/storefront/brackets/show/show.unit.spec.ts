import { test } from '@japa/runner'

import StorefrontBracketShowUseCase from './show.use-case.ts'

import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = MemoryRepositories.brackets()
  const useCase = await makeWithMemory(
    StorefrontBracketShowUseCase,
    BracketUnitFixtures.bindings(brackets),
  )

  return { brackets, useCase }
}

test.group('storefront/brackets > show (unit)', () => {
  test('devolve a chave inteira', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { bracket } = await BracketUnitFixtures.drawn(brackets)

    const result = await useCase.execute({ id: bracket.id })

    if (result.isLeft()) throw new Error('chave deveria existir')
    assert.lengthOf(result.value.matches, 3)
  })

  test('chave inexistente é 404 BRACKET_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91' })

    assert.deepInclude(result.value, { status: 404, code: 'BRACKET_NOT_FOUND' })
  })
})
