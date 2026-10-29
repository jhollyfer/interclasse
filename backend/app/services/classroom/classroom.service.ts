import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type User from '#models/user'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

/**
 * O que o módulo de contas ainda chama da turma. A regra e a persistência da
 * turma moram em `domain/classroom` e `repositories/classroom`; aqui fica só a
 * ponte de `detach`, que sai quando as contas migrarem.
 */
@inject()
export default class ClassroomService {
  constructor(
    private readonly classrooms: ClassroomRepository,
    private readonly transaction: TransactionContext,
  ) {}

  /**
   * Desfaz os vínculos de turma de uma conta que deixou de ser o que era: o
   * papel mudou, ou ela foi arquivada. Roda na transação do chamador (`client`),
   * para a escrita cair junto com a que a motiva.
   */
  async detach(user: User, client: TransactionClientContract): Promise<void> {
    await this.transaction.run(client, () => this.classrooms.detachAccount(user.id))
  }
}
