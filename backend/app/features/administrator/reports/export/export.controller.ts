import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorReportExportUseCase from './export.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class AdministratorReportExportController {
  static docs = defineDocs({
    summary: 'Baixar relatório em CSV',
    description:
      'O relatório por turma em CSV (UTF-8 com BOM, separado por `;`), que o Excel em ' +
      'português abre direto em colunas. A última linha é o total.',
    overrides: {
      responses: { 200: { type: 'string', description: 'O arquivo CSV.' } },
    },
  })

  constructor(private readonly useCase: AdministratorReportExportUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    context.response.header('Content-Type', 'text/csv; charset=utf-8')
    context.response.header('Content-Disposition', 'attachment; filename="relatorio-jogos.csv"')
    return context.response.ok(result.value)
  }
}
