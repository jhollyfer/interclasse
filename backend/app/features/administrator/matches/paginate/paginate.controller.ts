import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdministratorMatchPaginateUseCase from './paginate.use-case.ts'
import { AdministratorMatchPaginationValidator } from '#core/validator'

@inject()
export default class AdministratorMatchPaginateController {
  static docs = defineDocs({
    description:
      'A tabela de jogos: partidas com os dois times definidos, as marcadas por horário ' +
      'primeiro. Filtra por chave, modalidade, categoria, fase e status.',
  })

  constructor(private readonly useCase: AdministratorMatchPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await AdministratorMatchPaginationValidator.validate(context.request.qs())
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
