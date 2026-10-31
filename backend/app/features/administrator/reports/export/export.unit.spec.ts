import { test } from '@japa/runner'
import { CATEGORY } from '@interclasse/shared'

import AdministratorReportExportUseCase from './export.use-case.ts'

import { ReportRepository } from '#repositories/report/report.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup(names: string[]) {
  const reports = MemoryRepositories.reports()
  names.forEach((name, index) =>
    reports.withClassroom({
      id: `c${index}`,
      name,
      grade: 7,
      category: CATEGORY.F2,
      advisor: 'Ana "Profa" Souza',
    }),
  )
  const useCase = await makeWithMemory(AdministratorReportExportUseCase, [
    [ReportRepository, reports],
  ])

  return { useCase }
}

test.group('administrator/reports > export (unit)', () => {
  test('opens in Excel: BOM, semicolon, quotes and total row', async ({ assert }) => {
    const { useCase } = await setup(['7º A', '7º B'])

    const result = await useCase.execute()

    if (result.isLeft()) throw new Error('esperava o CSV')
    const lines = result.value.split('\r\n')
    assert.isTrue(result.value.startsWith('﻿"Turma";"Categoria";"Conselheiro"'))
    assert.equal(lines[1], '"7º A";"Fundamental 2";"Ana ""Profa"" Souza";"";"0";"0";"0"')
    assert.equal(lines.at(-1), '"Total";"2 turmas";"";"";"0";"0";"0"')
  })

  test('a cell that starts as a formula gets an apostrophe', async ({ assert }) => {
    const { useCase } = await setup(['=1+1', '+2', '-3', '@x', '\tTab', '\rCR'])

    const result = await useCase.execute()

    if (result.isLeft()) throw new Error('esperava o CSV')
    const cells = result.value.split('\r\n').map((line) => line.split(';')[0])
    // Row 0 is the header; the classes come out in name order.
    assert.includeMembers(cells, [`"'=1+1"`, `"'+2"`, `"'-3"`, `"'@x"`, `"'\tTab"`])
    assert.include(result.value, `"'\rCR"`)
  })
})
