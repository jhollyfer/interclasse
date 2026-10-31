import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorBracketDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorBracketDeleteController {
  static docs = defineDocs({
    description:
      '**Irreversible**: deletes the bracket with all teams, matches and scores, and reopens the ' +
      'enrollments of the sport in that category. It is the way to redo a draw.\n\n' +
      'A bracket with a recorded score responds `409`: undo the scores first.',
  })

  constructor(private readonly useCase: AdministratorBracketDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
