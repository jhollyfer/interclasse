import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { Either } from '@interclasse/shared'

import { TransactionContext } from './transaction-context.ts'
import { UnitOfWork } from './unit-of-work.ts'

/**
 * A unidade de trabalho sobre a transação gerenciada à mão do Lucid
 * (_doc-lib/lucid.md#transactions): abre, deixa o `trx` no
 * `TransactionContext` que os repositories leem, e decide pelo `Either`.
 */
@inject()
export class UnitOfWorkLucid extends UnitOfWork {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async run<L, R>(work: () => Promise<Either<L, R>>): Promise<Either<L, R>> {
    const trx = await db.transaction()

    try {
      const result = await this.transaction.run(trx, work)

      if (result.isLeft()) await trx.rollback()
      else await trx.commit()

      return result
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
