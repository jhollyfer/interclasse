import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import AccountProfileShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class AccountProfileShowController {
  static docs = defineDocs({
    summary: 'Ler a própria conta',
    description:
      'A própria conta, seja qual for o papel. O usuário vem sempre da sessão: não há ' +
      'identificador no caminho, e não teria como haver - o escopo vem do token, nunca do ' +
      'payload.\n\n' +
      'O avatar vem precarregado, com a `url` derivada na serialização.',
  })

  constructor(private readonly useCase: AccountProfileShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute({ actor: context.actor })

    if (result.isLeft()) throw result.value

    return context.response.ok(result.value)
  }
}
