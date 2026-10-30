import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorSiteShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class AdministratorSiteShowController {
  static docs = defineDocs({
    summary: 'Configuração do site',
    description:
      'O texto do "Sobre", a edição, o ano da primeira edição, quem organiza, os ' +
      'Instagrams e o regulamento em PDF. Campo vazio é o que o site não mostra.',
  })

  constructor(private readonly useCase: AdministratorSiteShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
