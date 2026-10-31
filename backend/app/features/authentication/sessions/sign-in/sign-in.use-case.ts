import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { UserRepository } from '#repositories/user/user.repository'
import { SessionRepository, type SessionTokens } from '#repositories/session/session.repository'
import type { AuthenticationSessionSignInPayload } from '#validators/authentication/sessions.validator'

type Payload = AuthenticationSessionSignInPayload
type Response = Either<HTTPException, SessionTokens>

/**
 * Opens the session. Nonexistent account, wrong password, archived account and inactive
 * account get the same `401`: the response does not confirm that the account existed
 * nor why it was refused.
 *
 * Nothing from the payload is logged here: `backend-old` printed the received
 * password in the sign-in use case's `console.log`.
 */
@inject()
export default class AuthenticationSessionSignInUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // Alive or archived: whether it gets in is decided by the account, after the password
      // is checked.
      const user = await this.users.findByEmail(payload.email)

      // A nonexistent account also spends the time of a hash, so the response
      // does not reveal by the clock that the email is not registered.
      if (!user) {
        await hash.make(payload.password)

        return left(this.invalidCredentials())
      }

      const passwordMatches = await hash.verify(user.snapshot().password, payload.password)

      if (!passwordMatches || !user.canSignIn()) return left(this.invalidCredentials())

      const tokens = await this.sessions.issue(user.id)
      if (!tokens)
        return left(
          HTTPException.InternalServerError(
            this.i18n.t('errors.internal'),
            'AUTHENTICATION_SESSION_SIGN_IN_ERROR',
          ),
        )

      return right(tokens)
    } catch (error) {
      // Only a wrong credential becomes 401. Any other failure (database down, for
      // example) remains a server error - it is not worth lying with 401.
      logger.error({ err: error }, '[authentication/sessions > sign-in][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'AUTHENTICATION_SESSION_SIGN_IN_ERROR',
        ),
      )
    }
  }

  private invalidCredentials(): HTTPException {
    return HTTPException.Unauthorized(
      this.i18n.t('sessions.invalid_credentials'),
      'INVALID_CREDENTIALS',
      { root: this.i18n.t('sessions.invalid_credentials_field') },
    )
  }
}
