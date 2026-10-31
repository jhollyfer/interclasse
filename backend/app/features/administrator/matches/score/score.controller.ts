import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorMatchScoreUseCase from './score.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorMatchScoreValidator } from '#validators/administrator/matches.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorMatchScoreController {
  static docs = defineDocs({
    summary: 'Record score',
    description:
      'Saves the score and ends the match. It can be repeated to correct.\n\n' +
      'The winner goes on its own to the next match, and the final ends the bracket. A draw ' +
      'requires `winnerTeamId` - who won on penalties. Correcting the winner after the ' +
      'next match already has a score responds `409`.',
  })

  constructor(private readonly useCase: AdministratorMatchScoreUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(AdministratorMatchScoreValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
