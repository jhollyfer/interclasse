import type { Either } from '@interclasse/shared'

import { UnitOfWork } from './unit-of-work.ts'

/**
 * The unit of work of the unit test: it only executes. The in-memory repositories
 * have no transaction to undo, and the `left` test checks what the use case
 * left unsaved, not the rollback.
 */
export class UnitOfWorkMemory extends UnitOfWork {
  run<L, R>(work: () => Promise<Either<L, R>>): Promise<Either<L, R>> {
    return work()
  }
}
