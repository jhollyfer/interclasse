import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorSportCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorSportCreateValidator } from '#validators/administrator/sports.validator'

@inject()
export default class AdministratorSportCreateController {
  static docs = defineDocs({
    description:
      'O `slug` sai do nome. `minAthletes` é o corte do sorteio: turma com menos inscritos ' +
      'não entra na chave.',
    // Nascem na entidade e são traduzidos em `_shared.sport-refusal.ts`, fora da
    // pasta da ação: o introspector não os lê sozinho.
    errors: { 422: ['SPORT_INVALID_LIMITS'] },
  })

  constructor(private readonly useCase: AdministratorSportCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorSportCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
