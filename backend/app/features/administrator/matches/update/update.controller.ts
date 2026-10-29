import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorMatchUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { MatchUpdateValidator } from '#validators/administrator/matches.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorMatchUpdateController {
  static docs = defineDocs({
    summary: 'Agendar partida',
    description:
      'Data, hora e local. `scheduledAt` em ISO 8601 com fuso. `null` desmarca. O placar ' +
      'não entra aqui: é `PUT /administrator/matches/:id/score`.',
  })

  constructor(private readonly useCase: AdministratorMatchUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(MatchUpdateValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
