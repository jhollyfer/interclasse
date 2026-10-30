/**
 * A guarda do bootstrap dos testes: a suíte roda `truncate()` entre os testes,
 * então subir contra o banco de desenvolvimento ou de produção apagaria dado de
 * verdade. O banco da suíte tem o sufixo `_test` no nome, e qualquer outro
 * derruba o runner antes da primeira migration (_standards/backend.md §7,
 * "E2E nunca toca banco de produção").
 */
export class DatabaseGuard {
  static readonly SUFFIX = '_test'

  /** O nome do banco da `DATABASE_URL`, sem a query string. */
  static databaseName(url: string): string {
    return new URL(url).pathname.replace(/^\//, '')
  }

  /** Lança se a URL não aponta para um banco `_test`. */
  static assertTestDatabase(url: string | undefined): void {
    if (!url) throw new Error('DATABASE_URL ausente: a suíte não sabe em que banco rodar.')

    const name = DatabaseGuard.databaseName(url)

    if (!name.endsWith(DatabaseGuard.SUFFIX))
      throw new Error(
        `A suíte recusa subir: o banco "${name}" não termina em "${DatabaseGuard.SUFFIX}". ` +
          'Ela apaga as tabelas entre os testes; aponte DATABASE_URL de .env.test para o banco de teste.',
      )
  }
}
