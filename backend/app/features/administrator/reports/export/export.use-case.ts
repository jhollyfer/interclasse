import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import ReportService, { type Report } from '#services/report/report.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { CATEGORY, type Category } from '#core/entity'

type Response = Either<HTTPException, string>

/** O rótulo da categoria na planilha, como o site escreve. */
const CATEGORY_LABELS = {
  [CATEGORY.F1]: 'Fundamental 1',
  [CATEGORY.F2]: 'Fundamental 2',
} satisfies Record<Category, string>

/**
 * `;` e não `,`: é o separador que o Excel em português abre direto em colunas,
 * sem assistente de importação - a vírgula lá é o decimal.
 */
const SEPARATOR = ';'

/**
 * O relatório em CSV, para baixar e abrir no Excel: uma linha por turma e a
 * linha de total no fim.
 */
@inject()
export default class AdministratorReportExportUseCase {
  constructor(private readonly reports: ReportService) {}

  async execute(): Promise<Response> {
    try {
      return right(this.csv(await this.reports.build()))
    } catch (error) {
      logger.error({ err: error }, '[reports > export][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_REPORT_EXPORT_ERROR',
        ),
      )
    }
  }

  private csv(report: Report): string {
    const header = [
      'Turma',
      'Categoria',
      'Conselheiro',
      'Representante',
      'Alunos',
      'Atletas',
      'Modalidades',
    ]
    const rows = report.classrooms.map((classroom) => [
      classroom.name,
      CATEGORY_LABELS[classroom.category],
      classroom.advisor ?? '',
      classroom.representative ?? '',
      String(classroom.students),
      String(classroom.athletes),
      String(classroom.sports),
    ])
    const total = [
      'Total',
      `${report.totals.classrooms} turmas`,
      '',
      '',
      String(report.totals.students),
      String(report.totals.athletes),
      String(report.totals.sports),
    ]

    // O BOM na frente: sem ele o Excel lê o arquivo como Latin-1, e "3º" e
    // "Conceição" viram lixo.
    return '﻿'.concat(
      [header, ...rows, total]
        .map((line) => line.map((cell) => this.cell(cell)).join(SEPARATOR))
        .join('\r\n'),
    )
  }

  /**
   * Uma célula: entre aspas, aspas dobradas, e com apóstrofo na frente do que
   * começa como fórmula (`=`, `+`, `-`, `@`). Nome de turma ou de pessoa é texto
   * digitado por gente, e sem isso viraria fórmula executada ao abrir a
   * planilha (injeção de CSV).
   */
  private cell(value: string): string {
    let text = value
    if (/^[=+\-@\t\r]/.test(text)) text = "'".concat(text)

    return '"'.concat(text.replaceAll('"', '""'), '"')
  }
}
