import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorSportDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorSportDeleteController {
  static docs = defineDocs({
    description:
      '**Irreversible**. A sport with enrolled athletes or a drawn bracket responds `409`: ' +
      'deleting it would lose the lists the classrooms built.',
  })

  constructor(private readonly useCase: AdministratorSportDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
