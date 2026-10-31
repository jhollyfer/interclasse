import type { AdministratorReportShowResponse } from '@interclasse/shared'

/** The file texts, already in the request language (`_standards/i18n.md`). */
export type ReportPresenterLabels = {
  readonly header: ReadonlyArray<string>
  readonly total: string
  /** The text of the classrooms cell in the total row. */
  readonly totalClassrooms: (count: number) => string
  readonly category: (
    category: AdministratorReportShowResponse['classrooms'][number]['category'],
  ) => string
}

/**
 * `;` and not `,`: it is the separator that Excel in Portuguese opens straight into columns,
 * without an import wizard - the comma there is the decimal.
 */
const SEPARATOR = ';'

/**
 * The report as CSV to download and open in Excel: one row per classroom and the
 * total row at the end. A pure class, with no I/O nor language of its own: the text comes
 * ready in `labels`, and the use case is the one that fetches it from i18n.
 */
export class ReportPresenter {
  static csv(report: AdministratorReportShowResponse, labels: ReportPresenterLabels): string {
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

    // The BOM up front: without it Excel reads the file as Latin-1, and "3º" and
    // "Conceição" turn into garbage.
    return '\uFEFF'.concat(
      [[...labels.header], ...rows, total]
        .map((line) => line.map((cell) => ReportPresenter.cell(cell)).join(SEPARATOR))
        .join('\r\n'),
    )
  }

  /**
   * A cell: quoted, quotes doubled, and with an apostrophe in front of what
   * starts as a formula (`=`, `+`, `-`, `@`, tab or CR). A classroom or person
   * name is text typed by people, and without this it would become a formula executed on
   * opening the spreadsheet (CSV injection).
   */
  private static cell(value: string): string {
    let text = value
    if (/^[=+\-@\t\r]/.test(text)) text = "'".concat(text)

    return '"'.concat(text.replaceAll('"', '""'), '"')
  }
}
