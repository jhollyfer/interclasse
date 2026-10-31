/**
 * Postgres errors the repository recognizes and returns as a domain fact,
 * instead of letting them rise as a 500. It exists because the duplicate check
 * before the `INSERT` does not close the race: two simultaneous requests pass the
 * read and the second runs into the database `unique` (_standards/backend.md §4.4).
 *
 * Only reads the error in hand, no import: `core/` knows neither Lucid nor the driver.
 */
export class PostgresError {
  /** Postgres code for a `unique` violation. */
  private static readonly UNIQUE_VIOLATION = '23505'

  static isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Error && 'code' in error && error.code === PostgresError.UNIQUE_VIOLATION
    )
  }

  /** The name of the violated `unique`, when Postgres reports it. */
  static violatedConstraint(error: unknown): string | undefined {
    if (!PostgresError.isUniqueViolation(error) || !(error instanceof Error)) return undefined
    if (!('constraint' in error) || typeof error.constraint !== 'string') return undefined

    return error.constraint
  }
}
