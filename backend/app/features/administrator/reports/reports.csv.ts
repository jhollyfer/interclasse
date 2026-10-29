import type { AdministratorReportShowResponse } from '@interclasse/shared'

/** Os textos do arquivo, já no idioma da requisição (`_standards/i18n.md`). */
export type ReportCsvLabels = {
  readonly header: ReadonlyArray<string>
  readonly total: string
  /** O texto da célula de turmas na linha de total. */
  readonly totalClassrooms: (count: number) => string
  readonly category: (
    category: AdministratorReportShowResponse['classrooms'][number]['category'],
  ) => string
}

/**
 * `;` e não `,`: é o separador que o Excel em português abre direto em colunas,
 * sem assistente de importação - a vírgula lá é o decimal.
 */
const SEPARATOR = ';'

/**
 * O relatório como CSV para baixar e abrir no Excel: uma linha por turma e a
 * linha de total no fim. Classe pura, sem I/O nem idioma próprio: o texto vem
 * pronto em `labels`, e o use-case é quem o busca no i18n.
 */
export class ReportCsv {
  static build(report: AdministratorReportShowResponse, labels: ReportCsvLabels): string {
    const rows = report.classrooms.map((classroom) => [
      classroom.name,
      labels.category(classroom.category),
      classroom.advisor ?? '',
      classroom.representative ?? '',
      String(classroom.students),
      String(classroom.athletes),
      String(classroom.sports),
    ])
    const total = [
      labels.total,
      labels.totalClassrooms(report.totals.classrooms),
      '',
      '',
      String(report.totals.students),
      String(report.totals.athletes),
      String(report.totals.sports),
    ]

    // O BOM na frente: sem ele o Excel lê o arquivo como Latin-1, e "3º" e
    // "Conceição" viram lixo.
    return '\uFEFF'.concat(
      [[...labels.header], ...rows, total]
        .map((line) => line.map((cell) => ReportCsv.cell(cell)).join(SEPARATOR))
        .join('\r\n'),
    )
  }

  /**
   * Uma célula: entre aspas, aspas dobradas, e com apóstrofo na frente do que
   * começa como fórmula (`=`, `+`, `-`, `@`, tab ou CR). Nome de turma ou de
   * pessoa é texto digitado por gente, e sem isso viraria fórmula executada ao
   * abrir a planilha (injeção de CSV).
   */
  private static cell(value: string): string {
    let text = value
    if (/^[=+\-@\t\r]/.test(text)) text = "'".concat(text)

    return '"'.concat(text.replaceAll('"', '""'), '"')
  }
}
