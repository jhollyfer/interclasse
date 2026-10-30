import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import AuthenticationSessionSignOutUseCase from './sign-out.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { COOKIE_TOKEN, cookieOptions } from '#config/cookie'

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

    // Os MESMOS atributos da emissão, e não `clearCookie` pelado: sem eles o
    // navegador cria um segundo cookie host-only vazio e o de domínio sobrevive.
    context.response
      .clearCookie(COOKIE_TOKEN.ACCESS, cookieOptions.clear)
      .clearCookie(COOKIE_TOKEN.REFRESH, cookieOptions.clear)

    return context.response.noContent()
  }
}
