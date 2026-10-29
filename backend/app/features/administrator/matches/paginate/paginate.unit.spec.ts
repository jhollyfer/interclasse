import { test } from '@japa/runner'
import { MATCH_PHASE } from '@interclasse/shared'

import AdministratorMatchPaginateUseCase from './paginate.use-case.ts'

import { BracketMemoryRepository } from '#repositories/bracket/bracket.memory.repository'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/unit-fixtures'

async function setup() {
  const brackets = new BracketMemoryRepository()
  const useCase = await makeWithMemory(
    AdministratorMatchPaginateUseCase,
    BracketUnitFixtures.bindings(brackets),
  )
  const drawn = await BracketUnitFixtures.drawn(brackets)

  return { useCase, ...drawn }
}

test.group('administrator/matches > paginate (unit)', () => {
  test('lista só as partidas com os dois times definidos', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({})

    if (result.isLeft()) throw new Error('lista deveria vir')
    // Duas semifinais; a final ainda não tem adversário.
    assert.equal(result.value.meta.total, 2)
    assert.isTrue(result.value.data.every((match) => match.phase === MATCH_PHASE.SEMI))
  })

  test('mostra a turma só com id, nome e categoria', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({})

    if (result.isLeft()) throw new Error('lista deveria vir')
    assert.deepEqual(Object.keys(result.value.data[0]?.homeTeam.classroom ?? {}).sort(), [
      'category',
      'id',
      'name',
    ])
  })

  test('filtra por turma', async ({ assert }) => {
    const { useCase, classrooms } = await setup()

    const result = await useCase.execute({ classroomId: classrooms[0]?.id })

    if (result.isLeft()) throw new Error('lista deveria vir')
    assert.equal(result.value.meta.total, 1)
  })

  test('filtra por fase sem partida pronta', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ phase: MATCH_PHASE.FINAL })

    if (result.isLeft()) throw new Error('lista deveria vir')
    assert.equal(result.value.meta.total, 0)
  })
})
