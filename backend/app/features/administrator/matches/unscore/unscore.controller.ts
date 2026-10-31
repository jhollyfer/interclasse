import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorMatchUnscoreUseCase from './unscore.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorMatchUnscoreController {
  static docs = defineDocs({
    summary: 'Undo score',
    description:
      'Deletes the score and returns the match to "to play". The winner leaves the slot of the ' +
      'next match, and an undone final reopens the bracket. Refused with `409` when the ' +
      'next match already has a score: undo it first.',
  })

  constructor(private readonly useCase: AdministratorMatchUnscoreUseCase) {}

  async handle(context: HttpContext) {
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(params)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
