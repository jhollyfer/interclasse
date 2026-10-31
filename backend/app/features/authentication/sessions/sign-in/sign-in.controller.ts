import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import AuthenticationSessionSignInUseCase from './sign-in.use-case.ts'

import { AuthenticationSessionSignInValidator } from '#validators/authentication/sessions.validator'
import { defineDocs } from '#core/openapi/types'
import { COOKIE_TOKEN, cookieOptions } from '#config/cookie'

@inject()
export default class AuthenticationSessionSignInController {
  static docs = defineDocs({
    summary: 'Open session',
    description:
      'Opens the session. Responds `204` **without a body**: what matters is the `Set-Cookie` with the `httpOnly` ' +
      'token pair. The client never handles the token, and no user ' +
      'data travels inside it.\n\n' +
      'The failure is **indistinguishable by cause**: wrong password, inactive account and archived account ' +
      'return the same `401`. That is what prevents discovering, from the response, which emails exist.',
  })

  constructor(private readonly useCase: AuthenticationSessionSignInUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AuthenticationSessionSignInValidator)
    const result = await this.useCase.execute(payload)

    if (result.isLeft()) throw result.value

    context.response
      .cookie(COOKIE_TOKEN.ACCESS, result.value.accessToken, cookieOptions.access)
      .cookie(COOKIE_TOKEN.REFRESH, result.value.refreshToken, cookieOptions.refresh)

    return context.response.noContent()
  }
}
