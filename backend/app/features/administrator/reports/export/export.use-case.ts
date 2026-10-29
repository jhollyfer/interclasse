import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import { ReportCsv } from '../reports.csv.ts'

import { ReportRepository } from '#repositories/report/report.repository'
import HTTPException from '#exceptions/http.exception'

type Response = Either<HTTPException, string>

/**
 * O relatório em CSV, para baixar e abrir no Excel: uma linha por turma e a
 * linha de total no fim. Os rótulos saem do i18n, no idioma da requisição.
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
        ReportCsv.build(report, {
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
