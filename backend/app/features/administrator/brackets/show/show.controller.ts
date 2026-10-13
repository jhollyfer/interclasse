import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorBracketShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { BracketDetailResponse } from '#core/openapi/response'
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
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
