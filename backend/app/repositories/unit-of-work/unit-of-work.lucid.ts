import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { Either } from '@interclasse/shared'

import { UnitOfWork } from './unit-of-work.ts'

import { TransactionContext } from '#core/transaction-context'

/**
 * The unit of work over Lucid's manually managed transaction
 * (_doc-lib/lucid.md#transactions): it opens, leaves the `trx` in the
 * `TransactionContext` the repositories read, and decides by the `Either`.
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
