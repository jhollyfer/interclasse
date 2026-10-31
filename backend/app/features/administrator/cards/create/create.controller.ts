import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorCardCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorCardCreateValidator } from '#validators/administrator/cards.validator'

@inject()
export default class AdministratorCardCreateController {
  static docs = defineDocs({
    description:
      'Records a yellow or red card for an athlete in a match. The athlete must be ' +
      'from one of the two classrooms of the match.',
  })

  constructor(private readonly useCase: AdministratorCardCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorCardCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
