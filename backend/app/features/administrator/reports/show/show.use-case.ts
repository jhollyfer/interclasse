import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import ReportService, { type Report } from '#services/report/report.service'
import HTTPException from '#exceptions/http.exception'

type Response = Either<HTTPException, Report>

@inject()
export default class AdministratorReportShowUseCase {
  constructor(private readonly reports: ReportService) {}

  async execute(): Promise<Response> {
    try {
      return right(await this.reports.build())
    } catch (error) {
      logger.error({ err: error }, '[reports > show][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_REPORT_SHOW_ERROR',
        ),
      )
    }
  }
}
