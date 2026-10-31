import type { AdministratorReportShowResponse } from '@interclasse/shared'

/**
 * The read of the games numbers (`_standards/domain.md` §5.1): how many
 * classrooms, students and athletes took part, by category, by sport and by
 * classroom. It only reads - it has no entity, because there is no rule to protect - and serves
 * two outputs, the screen and the CSV, which must give the same numbers.
 */
export abstract class ReportRepository {
  /** Everything counted at once; no student row goes up to the application. */
  abstract summarize(): Promise<AdministratorReportShowResponse>
}
