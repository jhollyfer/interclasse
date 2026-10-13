import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import AdministratorBracketShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { BracketDetailResponse } from '#core/response'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorBracketShowController {
  static docs = defineDocs({
    description:
      'A chave inteira: todas as partidas de cada fase, com os nomes das turmas e o campeão ' +
      'quando a final termina.',
    responses: { 200: BracketDetailResponse },
  })

  constructor(private readonly useCase: AdministratorBracketShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await IdentifierValidator.validate(context.params)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
