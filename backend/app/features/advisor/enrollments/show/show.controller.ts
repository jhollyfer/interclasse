import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorEnrollmentShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdvisorEnrollmentShowValidator } from '#validators/advisor/enrollments.validator'

@inject()
export default class AdvisorEnrollmentShowController {
  static docs = defineDocs({
    description:
      'The student x sport matrix of an advisor classroom: who is enrolled in what, and ' +
      'which sports are already locked by the draw. A foreign or missing classroom responds `404`.',
  })

  constructor(private readonly useCase: AdvisorEnrollmentShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdvisorEnrollmentShowValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
