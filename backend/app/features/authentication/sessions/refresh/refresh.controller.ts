import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { defineDocs } from '#core/openapi/types'
import AuthenticationSessionRefreshUseCase from './refresh.use-case.ts'
import CookieService, { COOKIE_TOKEN, issueSessionTokens } from '#services/cookie/cookie.service'

@inject()
export default class AuthenticationSessionRefreshController {
  static docs = defineDocs({
    summary: 'Renovar sessão',
    description:
      'Renova a sessão a partir do cookie de refresh, e responde `204` com o par de tokens ' +
      'novo no `Set-Cookie`.\n\n' +
      'Fica **fora** do grupo autenticado de propósito: é justamente o token de acesso vencido ' +
      'que traz alguém até aqui, então exigir sessão válida tornaria a rota inalcançável. Quem ' +
      'autoriza é o cookie de refresh, e nada mais.\n\n' +
      '**Rotaciona**: o refresh usado é apagado ao emitir o novo. Duas renovações simultâneas ' +
      'com o mesmo token gastam-no duas vezes, e a segunda derruba a sessão.\n\n' +
      'Cookie ausente, ilegível ou que não seja de refresh responde `401`, sem distinguir qual ' +
      'dos três foi.',
  })

  constructor(
    private readonly cookie: CookieService,
    private readonly useCase: AuthenticationSessionRefreshUseCase
  ) {}

  async handle(context: HttpContext) {
    const refreshToken = context.request.cookie(COOKIE_TOKEN.REFRESH)
    const result = await this.useCase.execute({ refreshToken })

    if (result.isLeft()) throw result.value

    const tokens = await issueSessionTokens(result.value)

    this.cookie.set(context, tokens)

    return context.response.noContent()
  }
}
