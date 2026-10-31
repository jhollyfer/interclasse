import { test } from '@japa/runner'
import { CATEGORY } from '@interclasse/shared'

import AdministratorBracketCreateUseCase from './create.use-case.ts'

import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = MemoryRepositories.brackets()
  const useCase = await makeWithMemory(
    AdministratorBracketCreateUseCase,
    BracketUnitFixtures.bindings(brackets),
  )

  return { brackets, useCase }
}

test.group('administrator/brackets > create (unit)', () => {
  test('draws the whole bracket and responds with the sport', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { sport } = await BracketUnitFixtures.enrolled(brackets, ['8º A', '8º B', '8º C', '8º D'])

    const result = await useCase.execute({ sportId: sport.id, category: CATEGORY.F2 })

    assert.isTrue(result.isRight())
    assert.isTrue(result.isRight() && result.value.created)
    assert.equal(result.isRight() && result.value.bracket.sport.name, sport.name)
    const saved = await brackets.findBySportAndCategory(sport.id, CATEGORY.F2)
    assert.lengthOf(saved?.snapshot().teams ?? [], 4)
    assert.lengthOf(saved?.snapshot().matches ?? [], 3)
  })

  test('drawing again returns the same bracket, without a new draw', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { sport } = await BracketUnitFixtures.enrolled(brackets, ['8º A', '8º B', '8º C'])
    const first = await useCase.execute({ sportId: sport.id, category: CATEGORY.F2 })

    const again = await useCase.execute({ sportId: sport.id, category: CATEGORY.F2 })

    assert.isTrue(again.isRight() && !again.value.created)
    assert.equal(
      again.isRight() && again.value.bracket.id,
      first.isRight() && first.value.bracket.id,
    )
  })

  test('nonexistent sport is 422 SPORT_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      sportId: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91',
      category: CATEGORY.F2,
    })

    assert.deepInclude(result.value, { status: 422, code: 'SPORT_NOT_FOUND' })
  })

  test('fewer than two classrooms with the minimum is 409 NOT_ENOUGH_TEAMS and does not save', async ({
    assert,
  }) => {
    const { brackets, useCase } = await setup()
    const { sport } = await BracketUnitFixtures.enrolled(brackets, ['8º A'])

    const result = await useCase.execute({ sportId: sport.id, category: CATEGORY.F2 })

    assert.deepInclude(result.value, { status: 409, code: 'NOT_ENOUGH_TEAMS' })
    assert.isNull(await brackets.findBySportAndCategory(sport.id, CATEGORY.F2))
  })

  test('more than 16 classrooms is 409 TOO_MANY_TEAMS', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { sport } = await BracketUnitFixtures.enrolled(
      brackets,
      Array.from({ length: 17 }, (_, index) => `8º ${index}`),
    )

    const result = await useCase.execute({ sportId: sport.id, category: CATEGORY.F2 })

    assert.deepInclude(result.value, { status: 409, code: 'TOO_MANY_TEAMS' })
  })
})
