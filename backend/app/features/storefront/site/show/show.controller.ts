import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorefrontSiteShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class StorefrontSiteShowController {
  static docs = defineDocs({
    summary: 'Sobre os jogos',
    description:
      'O "Sobre" dos jogos e o regulamento para baixar. `regulation` é nulo enquanto ' +
      'a organização não enviar o PDF; a `url` é assinada e vence em minutos.',
  })

  constructor(private readonly useCase: StorefrontSiteShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
