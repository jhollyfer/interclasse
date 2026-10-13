import { AuthenticationSignInValidator } from '#features/authentication/authentication.validator'
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { defineDocs } from '#core/openapi/types'
import CookieService, { issueSessionTokens } from '#services/cookie/cookie.service'
import AuthenticationSignInUseCase from './sign-in.use-case.ts'

@inject()
export default class AuthenticationSignInController {
  static docs = defineDocs({
    summary: 'Abrir sessão',
    description:
      'Abre a sessão. Responde `204` **sem corpo**: o que importa é o `Set-Cookie` com o par ' +
      'de tokens `httpOnly`. O cliente nunca manipula o token, e nenhum dado do ' +
      'usuário viaja dentro dele.\n\n' +
      'A falha é **indistinguível por causa**: senha errada, conta inativa e conta arquivada ' +
      'devolvem o mesmo `401`. É o que impede descobrir, pela resposta, quais e-mails existem.',
  })

  constructor(
    private readonly cookie: CookieService,
    private readonly useCase: AuthenticationSignInUseCase
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AuthenticationSignInValidator)
    const result = await this.useCase.execute(payload)

    if (result.isLeft()) throw result.value

    const tokens = await issueSessionTokens(result.value)
    this.cookie.set(context, tokens)

    return context.response.noContent()
  }
}
