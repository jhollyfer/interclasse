import type { Either } from '@interclasse/shared'

import { UnitOfWork } from './unit-of-work.ts'

/**
 * A unidade de trabalho do teste unitário: só executa. Os repositories em
 * memória não têm transação a desfazer, e o teste de `left` confere o que o
 * use-case deixou de gravar, não o rollback.
 */
export class UnitOfWorkMemory extends UnitOfWork {
  run<L, R>(work: () => Promise<Either<L, R>>): Promise<Either<L, R>> {
    return work()
  }
}
