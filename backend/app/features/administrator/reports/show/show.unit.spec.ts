import { test } from '@japa/runner'
import { CATEGORY, MATCH_STATUS } from '@interclasse/shared'

import AdministratorReportShowUseCase from './show.use-case.ts'

import { ReportRepository } from '#repositories/report/report.repository'
import { ReportMemoryRepository } from '#repositories/report/report.memory.repository'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const reports = new ReportMemoryRepository()
    .withClassroom({ id: 'c1', name: '7º A', grade: 7, category: CATEGORY.F2 })
    .withClassroom({ id: 'c2', name: '3º Z', grade: 3, category: CATEGORY.F1 })
    .withStudent('s1', 'c1')
    .withStudent('s2', 'c1')
    .withSport('futsal', 'Futsal')
    .withEnrollment('s1', 'futsal')
    .withMatch(MATCH_STATUS.FINISHED)
    .withMatch(MATCH_STATUS.SCHEDULED)
    .withMatch(MATCH_STATUS.SCHEDULED)
  const useCase = await makeWithMemory(AdministratorReportShowUseCase, [
    [ReportRepository, reports],
  ])

  return { useCase }
}

test.group('administrator/reports > show (unit)', () => {
  test('conta no total, por categoria, por modalidade e por turma', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute()

    if (result.isLeft()) throw new Error('esperava o relatório')
    assert.deepEqual(result.value.totals, {
      classrooms: 2,
      students: 2,
      athletes: 1,
      enrollments: 1,
      sports: 1,
      matchesPlayed: 1,
      matchesScheduled: 2,
    })
    assert.deepInclude(result.value.byCategory[1], { category: CATEGORY.F2, athletes: 1 })
    assert.deepInclude(result.value.bySport[0], { athletes: 1, classrooms: 1 })
    // Em ordem de ano: o 3º antes do 7º.
    assert.deepEqual(
      result.value.classrooms.map((classroom) => classroom.name),
      ['3º Z', '7º A'],
    )
  })
})
