import type { Either } from '@interclasse/shared'

/**
 * Mais de uma escrita, uma unidade de trabalho (`_standards/domain.md` §6,
 * `backend.md` §4.2). O use-case delimita a transação sem conhecer o ORM:
 * `commit` quando o trabalho devolve `right`, `rollback` em `left` e em
 * exceção. A falha de negócio desfaz a escrita sem `throw`.
 *
 * Só com duas ou mais escritas: uma escrita já é atômica.
 */
export abstract class UnitOfWork {
  abstract run<L, R>(work: () => Promise<Either<L, R>>): Promise<Either<L, R>>
}
