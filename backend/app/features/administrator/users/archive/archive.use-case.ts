import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { left, right, type Either } from '@interclasse/shared'

import User from '#models/user'
import SessionService from '#services/session/session.service'
import ClassroomService from '#services/classroom/classroom.service'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, User>

/**
 * Envia a conta para a lixeira. Usuário já arquivado é indistinguível de
 * inexistente (`404`), porque o filtro é o mesmo que toda leitura aplica.
 *
 * Diferente dos recursos de conteúdo, arquivar aqui **também revoga as
 * sessões**: o guard verifica assinatura e validade do token e não conhece
 * `deleted_at`, então sem isto o arquivado seguiria dentro do painel até o
 * token vencer - e arquivar não desligaria ninguém.
 *
 * A própria conta não chega aqui: a `UserPolicy`, checada pelo controller com
 * `ctx.bouncer`, a recusa com `403` antes de qualquer leitura. É a guarda de auto-trancamento do projeto
 * de referência, que mantém intocável a conta que ninguém mais consegue
 * restaurar; sem um terceiro papel para reservá-la, aqui o intocável é
 * quem está fazendo a requisição. Como todo administrador vivo é protegido de
 * si mesmo, o último deles nunca cai - a guarda de identidade já entrega o que
 * uma contagem entregaria.
 */
@inject()
export default class AdministratorUserArchiveUseCase {
  constructor(
    private readonly classrooms: ClassroomService,
    private readonly session: SessionService,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const user = await User.query()
        .where('id', id)
        .withScopes((scopes) => scopes.notDeleted())
        .first()

      if (!user) return left(HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'))

      // Arquivar, derrubar as sessões e soltar as turmas caem juntos: soltos, a
      // falha do segundo passo deixaria a conta arquivada com sessão viva.
      await db.transaction(async (trx) => {
        user.useTransaction(trx)
        user.deletedAt = DateTime.now()
        await user.save()

        await this.session.revokeAll(user, trx)
        // Conta arquivada não aconselha nem representa turma nenhuma.
        await this.classrooms.detach(user, trx)
      })

      return right(user)
    } catch (error) {
      logger.error({ err: error }, '[users > archive][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'USER_ARCHIVE_ERROR'),
      )
    }
  }
}
