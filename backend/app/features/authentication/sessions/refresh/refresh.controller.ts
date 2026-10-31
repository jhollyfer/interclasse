import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import AuthenticationSessionRefreshUseCase from './refresh.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { COOKIE_TOKEN, cookieOptions } from '#config/cookie'

@inject()
export default class AuthenticationSessionRefreshController {
  static docs = defineDocs({
    summary: 'Refresh session',
    description:
      'Refreshes the session from the refresh cookie, and responds `204` with the new token pair ' +
      'in `Set-Cookie`.\n\n' +
      'It sits **outside** the authenticated group on purpose: it is precisely the expired access token ' +
      'that brings someone here, so requiring a valid session would make the route unreachable. What ' +
      'authorizes is the refresh cookie, and nothing else.\n\n' +
      '**Rotates**: the used refresh is deleted when the new one is issued. Two simultaneous refreshes ' +
      'with the same token spend it twice, and the second drops the session.\n\n' +
      'A missing, unreadable or non-refresh cookie responds `401`, without distinguishing which ' +
      'of the three it was.',
  })

  constructor(private readonly useCase: AuthenticationSessionRefreshUseCase) {}

  async handle(context: HttpContext) {
    const refreshToken = context.request.cookie(COOKIE_TOKEN.REFRESH)
    const result = await this.useCase.execute({ refreshToken })

    if (result.isLeft()) throw result.value

    context.response
      .cookie(COOKIE_TOKEN.ACCESS, result.value.accessToken, cookieOptions.access)
      .cookie(COOKIE_TOKEN.REFRESH, result.value.refreshToken, cookieOptions.refresh)

    return context.response.noContent()
  }
}
