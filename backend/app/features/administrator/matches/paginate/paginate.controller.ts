import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorMatchPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorMatchPaginateValidator } from '#validators/administrator/matches.validator'

@inject()
export default class AdministratorMatchPaginateController {
  static docs = defineDocs({
    description:
      'The match table: matches with both teams defined, the scheduled ones by time ' +
      'first. Filters by bracket, sport, category, phase and status.',
  })

  constructor(private readonly useCase: AdministratorMatchPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorMatchPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
