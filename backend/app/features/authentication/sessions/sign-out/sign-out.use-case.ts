import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Actor, type Either } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { SessionRepository } from '#repositories/session/session.repository'

type Payload = {
  readonly actor: Actor
  /** O token de acesso que autenticou esta requisição. */
  readonly accessTokenId?: string
  readonly refreshToken?: string
}

type Response = Either<HTTPException, null>

@inject()
export default class AuthenticationSessionSignOutUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ actor, accessTokenId, refreshToken }: Payload): Promise<Response> {
    try {
      if (accessTokenId) await this.sessions.revoke(actor.id, accessTokenId)

      if (refreshToken) {
        // Token de refresh ilegível não impede a saída: os cookies são
        // limpos de qualquer forma pelo controller. `readRefresh` já devolve
        // `null` para o ilegível e para o que não é de refresh.
        const grant = await this.sessions.readRefresh(refreshToken)

        if (grant) await this.sessions.revoke(actor.id, grant.identifier)
      }

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[authentication/sessions > sign-out][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'AUTHENTICATION_SESSION_SIGN_OUT_ERROR',
        ),
      )
    }
  }
}
