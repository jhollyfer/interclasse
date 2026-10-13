import { inject } from '@adonisjs/core'
import { Secret } from '@adonisjs/core/helpers'
import logger from '@adonisjs/core/services/logger'

import User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { COOKIE_TOKEN } from '#services/cookie/cookie.service'

type Payload = {
  readonly actor: User
  readonly refreshToken?: string
}

type Response = Either<HTTPException, null>

@inject()
export default class AuthenticationSessionSignOutUseCase {
  async execute({ actor, refreshToken }: Payload): Promise<Response> {
    try {
      if (actor.currentAccessToken) {
        await User.accessTokens.delete(actor, actor.currentAccessToken.identifier)
      }

      if (refreshToken) {
        // Token de refresh ilegível não impede a saída: os cookies são
        // limpos de qualquer forma pelo controller.
        try {
          const token = await User.accessTokens.verify(new Secret(refreshToken))

          if (token && token.name === COOKIE_TOKEN.REFRESH) {
            await User.accessTokens.delete(actor, token.identifier)
          }
        } catch (error) {
          logger.debug({ err: error }, '[authentication > sign-out] token de refresh ilegível')
        }
      }

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[sessions > sign-out][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'SESSION_SIGN_OUT_ERROR'),
      )
    }
  }
}
