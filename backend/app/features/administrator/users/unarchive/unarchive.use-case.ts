import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import User from '#models/user'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, User>

/**
 * Tira a conta da lixeira. O espelho de `archive`: busca só o que está
 * arquivado, então usuário vivo é `404` aqui pela mesma razão que usuário
 * arquivado é `404` lá.
 *
 * Nenhum token é recriado - quem foi restaurado entra de novo pelo sign-in.
 *
 * Sem guarda de colisão de e-mail: o `create` reativa a linha arquivada em vez
 * de inserir outra, então nunca existe um registro-sombra ocupando o `unique`.
 */
@inject()
export default class AdministratorUserUnarchiveUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const user = await User.query()
        .where('id', id)
        .withScopes((scopes) => scopes.onlyDeleted())
        .first()

      if (!user) return left(HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'))

      user.deletedAt = null
      await user.save()

      return right(user)
    } catch (error) {
      logger.error({ err: error }, '[users > unarchive][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'USER_UNARCHIVE_ERROR'),
      )
    }
  }
}
