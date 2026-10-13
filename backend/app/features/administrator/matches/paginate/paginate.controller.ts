import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import AdministratorMatchPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { MatchPaginateValidator } from '#features/administrator/matches/matches.validator'

@inject()
export default class AdministratorMatchPaginateController {
  static docs = defineDocs({
    description:
      'A tabela de jogos: partidas com os dois times definidos, as marcadas por horário ' +
      'primeiro. Filtra por chave, modalidade, categoria, fase e status.',
  })

  constructor(private readonly useCase: AdministratorMatchPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await MatchPaginateValidator.validate(context.request.qs())
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
