/**
 * Erros do Postgres que viram resposta de negócio, e não 500.
 *
 * Função pura sobre o erro em mãos - é o critério de `_shared` (_padroes/backend.md,
 * seção 4.9). Existe porque a checagem de duplicado antes do `INSERT` não
 * fecha a corrida: dois pedidos simultâneos passam pelo `findBy` e o segundo
 * esbarra no `unique` do banco. Sem isto, esse segundo virava 500.
 */

/** Código do Postgres para violação de `unique`. */
const UNIQUE_VIOLATION = '23505'

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === UNIQUE_VIOLATION
}
