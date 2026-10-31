import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorStudentDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdvisorStudentDeleteController {
  static docs = defineDocs({
    description:
      'Removes the student from the classroom, with their enrollments. A student enrolled in a sport already ' +
      'drawn responds `409`: the drawn team would lose an athlete. A student from a foreign classroom ' +
      'responds `404`.',
  })

  constructor(private readonly useCase: AdvisorStudentDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
