import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdministratorMatchUpdateUseCase from './update.use-case.ts'
import { MatchUpdateValidator } from '#features/administrator/matches/matches.validator'
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
    const body = await MatchUpdateValidator.validate(context.request.body())
    const params = await IdentifierValidator.validate(context.request.params())
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
