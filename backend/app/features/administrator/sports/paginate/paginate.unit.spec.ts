import { test } from '@japa/runner'

import AdministratorSportPaginateUseCase from './paginate.use-case.ts'

import { SportRepository } from '#repositories/sport/sport.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'
import { seedSport } from '#tests/sports-unit-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

async function setup() {
  const sports = MemoryRepositories.sports()
  const useCase = await makeWithMemory(AdministratorSportPaginateUseCase, [
    [SportRepository, sports],
  ])

  return { sports, useCase }
}

test.group('administrator/sports > paginate (unit)', () => {
  test('lists by name, ascending, with meta', async ({ assert }) => {
    const { sports, useCase } = await setup()
    await seedSport(sports, 'Queimada')
    await seedSport(sports, 'Futsal')

    const page = rightOf(await useCase.execute({}))

    assert.deepEqual(
      page.data.map((sport) => sport.name),
      ['Futsal', 'Queimada'],
    )
    assert.equal(page.meta.total, 2)
  })

  test('the search narrows by name', async ({ assert }) => {
    const { sports, useCase } = await setup()
    await seedSport(sports, 'Queimada')
    await seedSport(sports, 'Futsal')

    const page = rightOf(await useCase.execute({ search: 'fut' }))

    assert.deepEqual(
      page.data.map((sport) => sport.name),
      ['Futsal'],
    )
  })

  test('repository failure is 500 ADMINISTRATOR_SPORT_PAGINATE_ERROR', async ({ assert }) => {
    const { sports, useCase } = await setup()
    sports.paginate = async () => {
      throw new Error('database down')
    }

    const result = await useCase.execute({})

    assert.deepInclude(result.value, { status: 500, code: 'ADMINISTRATOR_SPORT_PAGINATE_ERROR' })
  })
})
