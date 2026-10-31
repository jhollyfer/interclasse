import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorReportExportUseCase from './export.use-case.ts'

import { csvDownload } from '#features/_shared.csv'
import { defineDocs } from '#core/openapi/types'

@inject()
export default class AdministratorReportExportController {
  static docs = defineDocs({
    summary: 'Download report as CSV',
    description:
      'The per-classroom report as CSV (UTF-8 with BOM, separated by `;`), which Excel in ' +
      'Portuguese opens straight into columns. The last row is the total.',
    overrides: {
      responses: { 200: { type: 'string', description: 'O arquivo CSV.' } },
    },
  })

  constructor(private readonly useCase: AdministratorReportExportUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value

    return csvDownload(context.response, 'relatorio-jogos.csv', result.value)
  }
}
