import { errors as authErrors } from '@adonisjs/auth'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import User from '#models/user'
import { ActiveStatuses } from '#core/entity'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import type { SessionSignInPayload } from '#features/authentication/sessions/sessions.validator'

type Payload = SessionSignInPayload
type Response = Either<HTTPException, User>

@inject()
export default class AuthenticationSessionSignInUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const user = await User.verifyCredentials(payload.email, payload.password)

      // `verifyCredentials` não conhece `deleted_at` nem `status`. Conta
      // arquivada e conta inativa recebem o mesmo 401 da senha errada: a
      // resposta não confirma que a conta existiu nem por que foi recusada.
      if (user.deletedAt || user.status === ActiveStatuses.INACTIVE) {
        return left(
          HTTPException.Unauthorized('Credenciais inválidas', 'INVALID_CREDENTIALS', {
            root: 'Dados de acesso inválidos',
          }),
        )
      }

      return right(user)
    } catch (error) {
      // Só credencial errada vira 401. Qualquer outra falha (banco fora, por
      // exemplo) continua sendo erro de servidor - não vale mentir 401.
      //
      // Nada do payload é registrado em log aqui: `backend-old` imprimia a
      // senha recebida no `console.log` do caso de uso de sign-in.
      if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
        return left(
          HTTPException.Unauthorized('Credenciais inválidas', 'INVALID_CREDENTIALS', {
            root: 'Dados de acesso inválidos',
          }),
        )
      }

      logger.error({ err: error }, '[authentication > sign-in][error]')

      return left(HTTPException.InternalServerError('Erro interno do servidor', 'SIGN_IN_ERROR'))
    }
  }
}
