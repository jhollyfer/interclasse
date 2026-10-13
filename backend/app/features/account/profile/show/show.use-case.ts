import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'

type Payload = { actor: User }
type Response = Either<HTTPException, User>

/**
 * A leitura da própria conta: o `actor` da sessão (_padroes/backend.md §4.3).
 *
 * Sem nova consulta por id: o guard já leu a conta nesta requisição, com o
 * filtro de arquivado e de inativo - quem foi arquivado não chega até aqui.
 */
@inject()
export default class AccountProfileShowUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      // `avatar` carregado: é parte do recurso, e a `url` dele é derivada na
      // serialização pelo model `Storage`.
      await payload.actor.load('avatar')

      return right(payload.actor)
    } catch (error) {
      logger.error({ err: error }, '[profile > show][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'PROFILE_SHOW_ERROR'),
      )
    }
  }
}
