import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdministratorSportCreateUseCase from './create.use-case.ts'
import { SportCreateValidator } from '#features/administrator/sports/sports.validator'

@inject()
export default class AdministratorSportCreateController {
  static docs = defineDocs({
    description:
      'O `slug` sai do nome. `minAthletes` é o corte do sorteio: turma com menos inscritos ' +
      'não entra na chave.',
  })

  constructor(private readonly useCase: AdministratorSportCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(SportCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
