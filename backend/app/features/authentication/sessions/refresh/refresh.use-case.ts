import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { UserRepository } from '#repositories/user/user.repository'
import { SessionContract, type SessionTokens } from '#services/session/session.contract'

type Payload = {
  readonly refreshToken?: string
}

type Response = Either<HTTPException, SessionTokens>

@inject()
export default class AuthenticationSessionRefreshUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionContract,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    if (!payload.refreshToken) {
      return left(
        HTTPException.Unauthorized(this.i18n.t('sessions.missing'), 'REFRESH_TOKEN_MISSING'),
      )
    }

    // O `try` global começa antes da primeira ida ao banco (_standards/backend.md §4.2).
    try {
      const grant = await this.sessions.readRefresh(payload.refreshToken)

      if (!grant) return left(this.invalid())

      // A mesma pergunta do guard, e não só a leitura da conta: renovar sem o
      // filtro prorrogaria por escrito uma sessão que já foi encerrada.
      const user = await this.users.findById(grant.userId)

      if (!user || !user.canSignIn()) return left(this.invalid())

      // O `DELETE` é a seção crítica, e por isso vem antes de emitir: só quem
      // apagou a linha ganha o direito ao par novo. Sem contar as linhas
      // apagadas, duas renovações simultâneas emitiriam dois pares válidos a
      // partir do mesmo token - rotação que não rotaciona.
      if (!(await this.sessions.revoke(user.id, grant.identifier))) return left(this.invalid())

      return right(await this.sessions.issue(user.id))
    } catch (error) {
      logger.error({ err: error }, '[sessions > refresh][error]')

      return left(
        HTTPException.InternalServerError(this.i18n.t('errors.internal'), 'SESSION_REFRESH_ERROR'),
      )
    }
  }

  private invalid(): HTTPException {
    return HTTPException.Unauthorized(this.i18n.t('sessions.invalid'), 'REFRESH_TOKEN_INVALID')
  }
}
