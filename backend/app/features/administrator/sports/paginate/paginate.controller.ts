import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorSportPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import {
  SportPaginateValidator,
  SPORT_SORT_COLUMNS,
} from '#validators/administrator/sports.validator'

@inject()
export default class AdministratorSportPaginateController {
  static docs = defineDocs({
    description: `\`?sort\` aceita ${SPORT_SORT_COLUMNS.join(', ')}. Padrão: ordenada por nome.`,
  })

  constructor(private readonly useCase: AdministratorSportPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(SportPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
