import { AsyncLocalStorage } from 'node:async_hooks'

import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract, TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * A transação em curso, para o repository Lucid escrever dentro dela sem o
 * use-case passar o `trx` adiante (`_standards/domain.md` §6).
 *
 * `AsyncLocalStorage` do Node, e não o do `HttpContext`: a unidade de trabalho
 * existe também fora de requisição (seed, comando), e o escopo é o da chamada
 * a `UnitOfWorkLucid.run`, não o da requisição.
 */
export class TransactionContext {
  private static readonly storage = new AsyncLocalStorage<TransactionClientContract>()

  /** O cliente que a query usa: a transação aberta, ou a conexão padrão. */
  client(): QueryClientContract {
    return TransactionContext.storage.getStore() ?? db.connection()
  }

  /** Roda `work` com `trx` como a transação em curso. */
  run<T>(trx: TransactionClientContract, work: () => Promise<T>): Promise<T> {
    return TransactionContext.storage.run(trx, work)
  }
}
