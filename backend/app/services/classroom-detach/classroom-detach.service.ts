import { inject } from '@adonisjs/core'
import type { QueryClientContract, TransactionClientContract } from '@adonisjs/lucid/types/database'

import User from '#models/user'
import ClassroomService from '#services/classroom/classroom.service'
import { ClassroomDetachContract } from '#services/classroom-detach/classroom-detach.contract'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

/**
 * A ponte para `ClassroomService#detach` (ver o contrato): chama o método como
 * ele é hoje, com a transação em curso. Só vale dentro de uma `UnitOfWork`,
 * que é onde arquivar e trocar o papel soltam as turmas.
 */
@inject()
export default class ClassroomDetachService extends ClassroomDetachContract {
  constructor(
    private readonly classrooms: ClassroomService,
    private readonly transaction: TransactionContext,
  ) {
    super()
  }

  async detach(userId: string): Promise<void> {
    const client = this.transaction.client()
    if (!ClassroomDetachService.isTransaction(client))
      throw new Error('soltar as turmas exige uma unidade de trabalho em curso')

    // `detach` só lê o `id` da conta; o model com o id poupa uma consulta.
    const user = new User()
    user.id = userId

    await this.classrooms.detach(user, client)
  }

  private static isTransaction(client: QueryClientContract): client is TransactionClientContract {
    return client.isTransaction
  }
}
