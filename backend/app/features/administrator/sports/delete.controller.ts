import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdministratorSportDeleteUseCase from './delete.use-case.ts'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorSportDeleteController {
  static docs = defineDocs({
    description:
      '**Irreversível**. Modalidade com atletas inscritos ou chave sorteada responde `409`: ' +
      'apagá-la perderia as listas que as turmas montaram.',
  })

  constructor(private readonly useCase: AdministratorSportDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await IdentifierValidator.validate(context.params)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
