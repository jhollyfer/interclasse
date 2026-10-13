import User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, User>

@inject()
export default class AdministratorUserShowUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      // Usuário arquivado é indistinguível de inexistente aqui, porque o filtro
      // é o mesmo que a listagem padrão aplica. Para alcançá-lo, liste com
      // `?trashed`.
      const user = await User.query()
        .where('id', id)
        .withScopes((scopes) => scopes.notDeleted())
        .preload('avatar')
        .first()

      if (!user) return left(HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'))

      return right(user)
    } catch (error) {
      logger.error({ err: error }, '[users > show][error]')

      return left(HTTPException.InternalServerError('Erro interno do servidor', 'USER_SHOW_ERROR'))
    }
  }
}
