import User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { COOKIE_TOKEN } from '#services/cookie.service'
import { inject } from '@adonisjs/core'
import { Secret } from '@adonisjs/core/helpers'
import logger from '@adonisjs/core/services/logger'

type Payload = {
  user: User
  refreshToken?: string
}

type Response = Either<HTTPException, null>

@inject()
export default class AuthenticationSignOutUseCase {
  async execute({ user, refreshToken }: Payload): Promise<Response> {
    try {
      if (user.currentAccessToken) {
        await User.accessTokens.delete(user, user.currentAccessToken.identifier)
      }

      if (refreshToken) {
        // Token de refresh ilegível não impede a saída: os cookies são
        // limpos de qualquer forma pelo controller.
        try {
          const token = await User.accessTokens.verify(new Secret(refreshToken))

          if (token && token.name === COOKIE_TOKEN.REFRESH) {
            await User.accessTokens.delete(user, token.identifier)
          }
        } catch (error) {
          logger.debug({ err: error }, '[authentication > sign-out] token de refresh ilegível')
        }
      }

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[authentication > sign-out][error]')

      return left(HTTPException.InternalServerError('Erro interno do servidor', 'SIGN_OUT_ERROR'))
    }
  }
}
