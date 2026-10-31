import type { Either } from '@interclasse/shared'

/**
 * More than one write, one unit of work (`_standards/domain.md` §6,
 * `backend.md` §4.2). The use case delimits the transaction without knowing the ORM:
 * `commit` when the work returns `right`, `rollback` on `left` and on an
 * exception. A business failure undoes the write without `throw`.
 *
 * Only with two or more writes: a single write is already atomic.
 */
export abstract class UnitOfWork {
  abstract run<L, R>(work: () => Promise<Either<L, R>>): Promise<Either<L, R>>
}
