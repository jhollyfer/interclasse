import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdministratorMatchUnscoreUseCase from './unscore.use-case.ts'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorMatchUnscoreController {
  static docs = defineDocs({
    summary: 'Desfazer placar',
    description:
      'Apaga o placar e devolve a partida para "a jogar". O vencedor sai da vaga da ' +
      'partida seguinte, e uma final desfeita reabre a chave. Recusado com `409` quando a ' +
      'partida seguinte já tem placar: desfaça-a antes.',
  })

  constructor(private readonly useCase: AdministratorMatchUnscoreUseCase) {}

  async handle(context: HttpContext) {
    const params = await IdentifierValidator.validate(context.request.params())
    const result = await this.useCase.execute(params)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
