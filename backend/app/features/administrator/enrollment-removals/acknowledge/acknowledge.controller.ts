import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorEnrollmentRemovalAcknowledgeUseCase from './acknowledge.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorEnrollmentRemovalAcknowledgeController {
  static docs = defineDocs({
    summary: 'Dar ciência de remoção de atleta',
    description: 'Marca o aviso como lido. Repetir não muda a data da primeira ciência.',
  })

  constructor(private readonly useCase: AdministratorEnrollmentRemovalAcknowledgeUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
