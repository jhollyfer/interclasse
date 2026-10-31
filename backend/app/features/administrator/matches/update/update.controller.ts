import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorMatchUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorMatchUpdateValidator } from '#validators/administrator/matches.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorMatchUpdateController {
  static docs = defineDocs({
    summary: 'Schedule match',
    description:
      'Date, time and place. `scheduledAt` in ISO 8601 with a time zone. `null` unschedules. The score ' +
      'does not go in here: it is `PUT /administrator/matches/:id/score`.',
  })

  constructor(private readonly useCase: AdministratorMatchUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(AdministratorMatchUpdateValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
