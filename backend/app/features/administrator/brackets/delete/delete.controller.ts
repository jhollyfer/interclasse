import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorBracketDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorBracketDeleteController {
  static docs = defineDocs({
    description:
      '**Irreversível**: apaga a chave com todos os times, partidas e placares, e reabre as ' +
      'inscrições da modalidade naquela categoria. É o caminho para refazer um sorteio.\n\n' +
      'Chave com placar lançado responde `409`: desfaça os placares antes.',
    // Nasce na entidade e é traduzido em `_shared.bracket-refusal.ts`, fora da
    // pasta da ação: o introspector não o lê sozinho.
    errors: { 409: ['BRACKET_HAS_RESULTS'] },
  })

  constructor(private readonly useCase: AdministratorBracketDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
