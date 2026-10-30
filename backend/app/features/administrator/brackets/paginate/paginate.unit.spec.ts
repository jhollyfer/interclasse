import { test } from '@japa/runner'
import { BRACKET_STATUS } from '@interclasse/shared'

import AdministratorBracketPaginateUseCase from './paginate.use-case.ts'

import { MemoryRepositories } from '#tests/memory-fixtures'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = MemoryRepositories.brackets()
  const useCase = await makeWithMemory(
    AdministratorBracketPaginateUseCase,
    BracketUnitFixtures.bindings(brackets),
  )

  return { brackets, useCase }
}

test.group('administrator/brackets > paginate (unit)', () => {
  test('lista as chaves com a modalidade', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    const { sport } = await BracketUnitFixtures.drawn(brackets)

    const result = await useCase.execute({})

    assert.isTrue(result.isRight())
    assert.equal(result.isRight() && result.value.meta.total, 1)
    assert.equal(result.isRight() && result.value.data[0]?.sport.name, sport.name)
  })

  test('filtra por status', async ({ assert }) => {
    const { brackets, useCase } = await setup()
    await BracketUnitFixtures.drawn(brackets)

    const finished = await useCase.execute({ status: BRACKET_STATUS.FINISHED })

    assert.equal(finished.isRight() && finished.value.meta.total, 0)
  })
})
