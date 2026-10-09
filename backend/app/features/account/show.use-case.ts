import User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, User>

/**
 * A leitura da própria conta, com o id vindo da sessão.
 *
 * O `deletedAt` é filtrado aqui: o token de quem foi arquivado continua válido
 * até expirar - o guard só confere assinatura e validade -, e sem este filtro a
 * conta seguiria legível depois de arquivada.
 */
@inject()
export default class AccountShowUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      // `avatar` precarregado: é parte do recurso, e a `url` dele é derivada na
      // serialização pelo model `Storage`.
      const user = await User.query()
        .where('id', payload.id)
        .withScopes((scopes) => scopes.notDeleted())
        .preload('avatar')
        .first()

      if (!user) return left(HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'))

      return right(user)
    } catch (error) {
      logger.error({ err: error }, '[account > show][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'ACCOUNT_SHOW_ERROR')
      )
    }
  }
}
