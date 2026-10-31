import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorEnrollmentRemovalAcknowledgeUseCase from './acknowledge.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorEnrollmentRemovalAcknowledgeController {
  static docs = defineDocs({
    summary: 'Acknowledge athlete removal',
    description:
      'Marks the notice as read. Repeating does not change the date of the first acknowledgement.',
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
