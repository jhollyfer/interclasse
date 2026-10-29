import { test } from '@japa/runner'
import { CATEGORY } from '@interclasse/shared'

import AdministratorBracketPreviewUseCase from './preview.use-case.ts'

import { BracketMemoryRepository } from '#repositories/bracket/bracket.memory.repository'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/unit-fixtures'

async function setup() {
  const brackets = new BracketMemoryRepository()
  const useCase = await makeWithMemory(
    AdministratorBracketPreviewUseCase,
    BracketUnitFixtures.bindings(brackets),
  )

  return { brackets, useCase }
}

test.group('administrator/brackets > preview (unit)', () => {
  test('conta os atletas de cada turma e marca quem entra', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { sport, classrooms } = BracketUnitFixtures.enrolled(brackets, ['8º A', '8º B'])

    const result = await useCase.execute({ sportId: sport.id, category: CATEGORY.F2 })

    if (result.isLeft()) throw new Error('prévia deveria existir')
    assert.deepInclude(result.value, { minAthletes: 1, maxTeams: 16, drawn: false })
    assert.sameMembers(
      result.value.classrooms.map((classroom) => classroom.id),
      classrooms.map((classroom) => classroom.id),
    )
  })

  test('avisa quando a chave já foi sorteada', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { sport } = await BracketUnitFixtures.drawn(brackets)

    const result = await useCase.execute({ sportId: sport.id, category: CATEGORY.F2 })

    assert.isTrue(result.isRight() && result.value.drawn)
  })

  test('modalidade inexistente é 422 SPORT_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({
      sportId: '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91',
      category: CATEGORY.F2,
    })

    assert.deepInclude(result.value, { status: 422, code: 'SPORT_NOT_FOUND' })
  })
})
