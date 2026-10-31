import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorMatchAthletesUseCase from './athletes.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorMatchAthletesController {
  static docs = defineDocs({
    summary: 'List match athletes',
    description:
      'The students of the two classrooms of the match, with those enrolled in the sport marked. It is where ' +
      'the athlete of a card comes from.',
  })

  constructor(private readonly useCase: AdministratorMatchAthletesUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
