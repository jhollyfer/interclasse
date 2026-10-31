import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import AuthenticationSessionSignOutUseCase from './sign-out.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { COOKIE_TOKEN, cookieOptions } from '#config/cookie'

@inject()
export default class AuthenticationSessionSignOutController {
  static docs = defineDocs({
    summary: 'End session',
    description:
      'Ends the session **on the server**, not just on screen: deletes the current access token and the refresh token, ' +
      'then clears both cookies. Responds `204` without a body.\n\n' +
      'An unreadable refresh token does not prevent sign-out - the cookies are cleared anyway, ' +
      'because the result the person asked for is to be without a session.\n\n' +
      'It deletes only the tokens of this session. Dropping **all** of them is a consequence of changing email or ' +
      'password in `PUT /account`, not of this route.',
  })

  constructor(private readonly useCase: AuthenticationSessionSignOutUseCase) {}

  async handle(context: HttpContext) {
    const { actor } = context
    const refreshToken = context.request.cookie(COOKIE_TOKEN.REFRESH)

    const result = await this.useCase.execute({
      actor,
      accessTokenId: context.auth.user?.currentAccessToken?.identifier.toString(),
      refreshToken,
    })

    if (result.isLeft()) throw result.value

    // The SAME attributes as the issuing, not a bare `clearCookie`: without them the
    // browser creates a second empty host-only cookie and the domain one survives.
    context.response
      .clearCookie(COOKIE_TOKEN.ACCESS, cookieOptions.clear)
      .clearCookie(COOKIE_TOKEN.REFRESH, cookieOptions.clear)

    return context.response.noContent()
  }
}
