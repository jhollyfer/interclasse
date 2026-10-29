import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorMatchScoreUseCase from './score.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorMatchScoreValidator } from '#validators/administrator/matches.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorMatchScoreController {
  static docs = defineDocs({
    summary: 'Lançar placar',
    description:
      'Grava o placar e encerra a partida. Pode ser repetido para corrigir.\n\n' +
      'O vencedor vai sozinho para a partida seguinte, e a final encerra a chave. Empate ' +
      'exige `winnerTeamId` - quem venceu nos pênaltis. Corrigir o vencedor depois que a ' +
      'partida seguinte já tem placar responde `409`.',
    // Nascem na entidade e são traduzidos em `_shared.match-refusal.ts`, fora da
    // pasta da ação: o introspector não os lê sozinho.
    errors: { 409: ['MATCH_TEAMS_PENDING', 'NEXT_MATCH_PLAYED'], 422: ['MATCH_WINNER_REQUIRED'] },
  })

  constructor(private readonly useCase: AdministratorMatchScoreUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(AdministratorMatchScoreValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
