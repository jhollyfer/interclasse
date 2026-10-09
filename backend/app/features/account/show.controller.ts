import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { defineDocs } from '#core/openapi/types'
import AccountShowUseCase from './show.use-case.ts'

@inject()
export default class AccountShowController {
  static docs = defineDocs({
    summary: 'Ler a própria conta',
    description:
      'A própria conta, seja qual for o papel. O usuário vem sempre da sessão: não há ' +
      'identificador no caminho, e não teria como haver - o escopo vem do token, nunca do ' +
      'payload.\n\n' +
      'O avatar vem precarregado, com a `url` derivada na serialização.',
  })

  constructor(private readonly useCase: AccountShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute({ id: context.auth.user!.id })

    if (result.isLeft()) throw result.value

    return context.response.ok(result.value)
  }
}
