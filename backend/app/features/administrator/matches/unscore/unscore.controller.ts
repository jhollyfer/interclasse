import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorMatchUnscoreUseCase from './unscore.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorMatchUnscoreController {
  static docs = defineDocs({
    summary: 'Desfazer placar',
    description:
      'Apaga o placar e devolve a partida para "a jogar". O vencedor sai da vaga da ' +
      'partida seguinte, e uma final desfeita reabre a chave. Recusado com `409` quando a ' +
      'partida seguinte já tem placar: desfaça-a antes.',
    // Nascem na entidade e são traduzidos em `_shared.match-refusal.ts`, fora da
    // pasta da ação: o introspector não os lê sozinho.
    errors: { 409: ['MATCH_NOT_PLAYED', 'NEXT_MATCH_PLAYED'] },
  })

  constructor(private readonly useCase: AdministratorMatchUnscoreUseCase) {}

  async handle(context: HttpContext) {
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(params)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
