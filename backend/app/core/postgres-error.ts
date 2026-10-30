/**
 * Erros do Postgres que o repository reconhece e devolve como fato de domínio,
 * em vez de deixá-los subir como 500. Existe porque a checagem de duplicado
 * antes do `INSERT` não fecha a corrida: dois pedidos simultâneos passam pela
 * leitura e o segundo esbarra no `unique` do banco (_standards/backend.md §4.4).
 *
 * Só leitura do erro em mãos, sem import: o `core/` não conhece Lucid nem driver.
 */
export class PostgresError {
  /** Código do Postgres para violação de `unique`. */
  private static readonly UNIQUE_VIOLATION = '23505'

  static isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Error && 'code' in error && error.code === PostgresError.UNIQUE_VIOLATION
    )
  }

  /** O nome do `unique` violado, quando o Postgres o informa. */
  static violatedConstraint(error: unknown): string | undefined {
    if (!PostgresError.isUniqueViolation(error) || !(error instanceof Error)) return undefined
    if (!('constraint' in error) || typeof error.constraint !== 'string') return undefined

    return error.constraint
  }
}
