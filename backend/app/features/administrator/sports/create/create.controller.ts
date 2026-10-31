import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorSportCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorSportCreateValidator } from '#validators/administrator/sports.validator'

@inject()
export default class AdministratorSportCreateController {
  static docs = defineDocs({
    description:
      'The `slug` comes from the name. `minAthletes` is the draw cutoff: a classroom with fewer enrolled ' +
      'does not enter the bracket.',
  })

  constructor(private readonly useCase: AdministratorSportCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorSportCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
