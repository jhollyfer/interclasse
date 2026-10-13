import { inject } from '@adonisjs/core'
import { Secret } from '@adonisjs/core/helpers'
import logger from '@adonisjs/core/services/logger'
import type { AccessToken } from '@adonisjs/auth/access_tokens'

import User from '#models/user'
import { ActiveStatuses } from '#core/entity'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { COOKIE_TOKEN } from '#services/cookie/cookie.service'

type Payload = {
  refreshToken?: string
}

type Response = Either<HTTPException, User>

@inject()
export default class AuthenticationSessionRefreshUseCase {
  async execute(payload: Payload): Promise<Response> {
    if (!payload.refreshToken) {
      return left(HTTPException.Unauthorized('Sessão não encontrada', 'REFRESH_TOKEN_MISSING'))
    }

    let refreshToken: AccessToken | null = null

    // Um token ilegível faz o `verify` LANÇAR em vez de devolver null. Os dois
    // casos são a mesma coisa para quem chama: sessão inválida, não erro 500.
    try {
      refreshToken = await User.accessTokens.verify(new Secret(payload.refreshToken))
    } catch (error) {
      logger.debug({ err: error }, '[authentication > refresh] token ilegível')
    }

    if (!refreshToken || refreshToken.name !== COOKIE_TOKEN.REFRESH) {
      return left(HTTPException.Unauthorized('Sessão inválida', 'REFRESH_TOKEN_INVALID'))
    }

    try {
      // A mesma query do guard, e não `User.find`: renovar sem o filtro
      // prorrogaria por escrito uma sessão que já foi encerrada.
      const user = await User.query()
        .where('id', String(refreshToken.tokenableId))
        .withScopes((scopes) => scopes.notDeleted())
        .where('status', ActiveStatuses.ACTIVE)
        .first()

      if (!user) {
        return left(HTTPException.Unauthorized('Sessão inválida', 'REFRESH_TOKEN_INVALID'))
      }

      // O `DELETE` é a seção crítica, e por isso vem antes de emitir: só quem
      // apagou a linha ganha o direito ao par novo. Sem contar as linhas
      // apagadas, duas renovações simultâneas emitiriam dois pares válidos a
      // partir do mesmo token - rotação que não rotaciona.
      const deleted = await User.accessTokens.delete(user, refreshToken.identifier)

      if (deleted === 0) {
        return left(HTTPException.Unauthorized('Sessão inválida', 'REFRESH_TOKEN_INVALID'))
      }

      return right(user)
    } catch (error) {
      logger.error({ err: error }, '[authentication > refresh][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'REFRESH_TOKEN_ERROR'),
      )
    }
  }
}
