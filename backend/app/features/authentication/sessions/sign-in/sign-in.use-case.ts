import { errors as authErrors } from '@adonisjs/auth'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ACTIVE_STATUS, left, right, type Either } from '@interclasse/shared'

import User from '#models/user'
import HTTPException from '#exceptions/http.exception'
import SessionService, { type SessionTokens } from '#services/session/session.service'
import type { SessionSignInPayload } from '#features/authentication/sessions/sessions.validator'

type Payload = SessionSignInPayload
type Response = Either<HTTPException, SessionTokens>

@inject()
export default class AuthenticationSessionSignInUseCase {
  constructor(private readonly session: SessionService) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const user = await User.verifyCredentials(payload.email, payload.password)

      // `verifyCredentials` não conhece `deleted_at` nem `status`. Conta
      // arquivada e conta inativa recebem o mesmo 401 da senha errada: a
      // resposta não confirma que a conta existiu nem por que foi recusada.
      if (user.deletedAt || user.status === ACTIVE_STATUS.INACTIVE) {
        return left(
          HTTPException.Unauthorized('Credenciais inválidas', 'INVALID_CREDENTIALS', {
            root: 'Dados de acesso inválidos',
          }),
        )
      }

      return right(await this.session.issue(user))
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

      logger.error({ err: error }, '[sessions > sign-in][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'SESSION_SIGN_IN_ERROR'),
      )
    }
  }
}
