import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorCardCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorCardCreateValidator } from '#validators/administrator/cards.validator'

@inject()
export default class AdministratorCardCreateController {
  static docs = defineDocs({
    description:
      'Lança um cartão amarelo ou vermelho para um atleta numa partida. O atleta tem que ser ' +
      'de uma das duas turmas da partida.',
    // Nascem na entidade e são traduzidos em `_shared.card-refusal.ts`, fora da
    // pasta da ação: o introspector não os lê sozinho.
    errors: { 409: ['MATCH_TEAMS_PENDING'], 422: ['STUDENT_NOT_IN_MATCH'] },
  })

  constructor(private readonly useCase: AdministratorCardCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorCardCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
