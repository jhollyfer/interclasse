import { AsyncLocalStorage } from 'node:async_hooks'

import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract, TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * The transaction in progress, so the Lucid repository writes inside it without the
 * use case passing `trx` along (`_standards/domain.md` §6).
 *
 * Node's `AsyncLocalStorage`, not the `HttpContext`'s: the unit of work
 * also exists outside a request (seed, command), and the scope is that of the call
 * to `UnitOfWorkLucid.run`, not that of the request.
 */
export class TransactionContext {
  private static readonly storage = new AsyncLocalStorage<TransactionClientContract>()

  /** The client the query uses: the open transaction, or the default connection. */
  client(): QueryClientContract {
    return TransactionContext.storage.getStore() ?? db.connection()
  }

  /** Runs `work` with `trx` as the transaction in progress. */
  run<T>(trx: TransactionClientContract, work: () => Promise<T>): Promise<T> {
    return TransactionContext.storage.run(trx, work)
  }
}
