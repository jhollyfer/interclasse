import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import { ReportPresenter } from '../reports.presenter.ts'

import { ReportRepository } from '#repositories/report/report.repository'
import HTTPException from '#exceptions/http.exception'

type Response = Either<HTTPException, string>

/**
 * The report as CSV, to download and open in Excel: one row per classroom and the
 * total row at the end. The labels come from i18n, in the request language.
 */
@inject()
export default class AdministratorReportExportUseCase {
  constructor(
    private readonly reports: ReportRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(): Promise<Response> {
    try {
      const report = await this.reports.summarize()

      return right(
        ReportPresenter.csv(report, {
          header: [
            this.i18n.t('reports.csv.classroom'),
            this.i18n.t('reports.csv.category'),
            this.i18n.t('reports.csv.advisor'),
            this.i18n.t('reports.csv.representative'),
            this.i18n.t('reports.csv.students'),
            this.i18n.t('reports.csv.athletes'),
            this.i18n.t('reports.csv.sports'),
          ],
          total: this.i18n.t('reports.csv.total'),
          totalClassrooms: (count) => this.i18n.t('reports.csv.total_classrooms', { count }),
          category: (category) => this.i18n.t(`reports.category.${category}`),
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[administrator/reports > export][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_REPORT_EXPORT_ERROR',
        ),
      )
    }
  }
}
