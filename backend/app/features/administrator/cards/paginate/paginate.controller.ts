import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorCardPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { CardPaginateValidator } from '#features/administrator/cards/cards.validator'

@inject()
export default class AdministratorCardPaginateController {
  static docs = defineDocs({
    description:
      'Os cartões lançados, do mais novo ao mais antigo, com o atleta, o time e a partida. ' +
      'Filtra por partida, turma ou atleta.',
  })

  constructor(private readonly useCase: AdministratorCardPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(CardPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
