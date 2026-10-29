import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type AdministratorReportShowResponse, type Either } from '@interclasse/shared'

import { ReportRepository } from '#repositories/report/report.repository'
import HTTPException from '#exceptions/http.exception'

type Response = Either<HTTPException, AdministratorReportShowResponse>

@inject()
export default class AdministratorReportShowUseCase {
  constructor(
    private readonly reports: ReportRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(): Promise<Response> {
    try {
      return right(await this.reports.summarize())
    } catch (error) {
      logger.error({ err: error }, '[administrator/reports > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_REPORT_SHOW_ERROR',
        ),
      )
    }
  }
}
