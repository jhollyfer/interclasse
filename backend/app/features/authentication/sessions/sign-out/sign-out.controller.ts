import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import AuthenticationSessionSignOutUseCase from './sign-out.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import CookieService, { COOKIE_TOKEN } from '#services/cookie/cookie.service'

@inject()
export default class AuthenticationSessionSignOutController {
  static docs = defineDocs({
    summary: 'Encerrar sessão',
    description:
      'Encerra a sessão **no servidor**, e não só na tela: apaga o token de acesso atual e o de ' +
      'refresh, depois limpa os dois cookies. Responde `204` sem corpo.\n\n' +
      'Token de refresh ilegível não impede a saída - os cookies são limpos de qualquer forma, ' +
      'porque o resultado que a pessoa pediu é ficar sem sessão.\n\n' +
      'Apaga só os tokens desta sessão. Derrubar **todas** é consequência de trocar e-mail ou ' +
      'senha em `PUT /account`, não desta rota.',
  })

  constructor(
    private readonly cookie: CookieService,
    private readonly useCase: AuthenticationSessionSignOutUseCase,
  ) {}

  async handle(context: HttpContext) {
    const actor = context.auth.getUserOrFail()
    const refreshToken = context.request.cookie(COOKIE_TOKEN.REFRESH)

    const result = await this.useCase.execute({ actor, refreshToken })

    if (result.isLeft()) throw result.value

    this.cookie.clear(context)

    return context.response.noContent()
  }
}
