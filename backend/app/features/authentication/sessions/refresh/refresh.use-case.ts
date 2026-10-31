import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { UserRepository } from '#repositories/user/user.repository'
import { SessionRepository, type SessionTokens } from '#repositories/session/session.repository'

type Payload = {
  readonly refreshToken?: string
}

type Response = Either<HTTPException, SessionTokens>

@inject()
export default class AuthenticationSessionRefreshUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    if (!payload.refreshToken) {
      return left(
        HTTPException.Unauthorized(this.i18n.t('sessions.missing'), 'REFRESH_TOKEN_MISSING'),
      )
    }

    // The global `try` starts before the first trip to the database (_standards/backend.md §4.2).
    try {
      const grant = await this.sessions.readRefresh(payload.refreshToken)

      if (!grant) return left(this.invalid())

      // The same question as the guard, not just reading the account: refreshing without the
      // filter would extend in writing a session that was already ended.
      const user = await this.users.findById(grant.userId)

      if (!user || !user.canSignIn()) return left(this.invalid())

      // The `DELETE` is the critical section, and so it comes before issuing: only whoever
      // deleted the row earns the right to the new pair. Without counting the deleted
      // rows, two simultaneous refreshes would issue two valid pairs from
      // the same token - rotation that does not rotate.
      if (!(await this.sessions.revoke(user.id, grant.identifier))) return left(this.invalid())

      const tokens = await this.sessions.issue(user.id)
      if (!tokens)
        return left(
          HTTPException.InternalServerError(
            this.i18n.t('errors.internal'),
            'AUTHENTICATION_SESSION_REFRESH_ERROR',
          ),
        )

      return right(tokens)
    } catch (error) {
      logger.error({ err: error }, '[authentication/sessions > refresh][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'AUTHENTICATION_SESSION_REFRESH_ERROR',
        ),
      )
    }
  }

  private invalid(): HTTPException {
    return HTTPException.Unauthorized(this.i18n.t('sessions.invalid'), 'REFRESH_TOKEN_INVALID')
  }
}
