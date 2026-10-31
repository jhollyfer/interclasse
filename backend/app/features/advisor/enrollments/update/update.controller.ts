import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorEnrollmentUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdvisorEnrollmentUpdateValidator } from '#validators/advisor/enrollments.validator'

@inject()
export default class AdvisorEnrollmentUpdateController {
  static docs = defineDocs({
    description:
      'Replaces the classroom athlete list in a sport with the one sent, whole. Responds with the ' +
      'updated matrix. Also valid after the draw: the drawn team is the classroom. Removing an ' +
      'athlete requires `reason`, which becomes a notice for the organization. A foreign classroom responds `404`.',
  })

  constructor(private readonly useCase: AdvisorEnrollmentUpdateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdvisorEnrollmentUpdateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
