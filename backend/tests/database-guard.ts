/**
 * The test bootstrap guard: the suite runs `truncate()` between tests, so starting
 * against the development or production database would erase real data. The suite
 * database has the `_test` suffix in its name, and any other one brings the runner
 * down before the first migration (_standards/backend.md §7, "E2E never touches the
 * production database").
 */
export class DatabaseGuard {
  static readonly SUFFIX = '_test'

  /** The name of the `DATABASE_URL` database, without the query string. */
  static databaseName(url: string): string {
    return new URL(url).pathname.replace(/^\//, '')
  }

  /** Throws if the URL does not point to a `_test` database. */
  static assertTestDatabase(url: string | undefined): void {
    if (!url)
      throw new Error('DATABASE_URL missing: the suite does not know which database to run on.')

    const name = DatabaseGuard.databaseName(url)

    if (!name.endsWith(DatabaseGuard.SUFFIX))
      throw new Error(
        `The suite refuses to start: database "${name}" does not end in "${DatabaseGuard.SUFFIX}". ` +
          'It drops the tables between tests; point DATABASE_URL of .env.test to the test database.',
      )
  }
}
