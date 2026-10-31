import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import RepresentativeEnrollmentUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { RepresentativeEnrollmentUpdateValidator } from '#validators/representative/enrollments.validator'

@inject()
export default class RepresentativeEnrollmentUpdateController {
  static docs = defineDocs({
    description:
      'Adds athletes from the own classroom to a sport: the list sent is the whole new list, ' +
      'and must contain every athlete already enrolled - removing someone is for the advisor ' +
      'teacher (`403`). Only students of the classroom; after the draw, `409`.',
  })

  constructor(private readonly useCase: RepresentativeEnrollmentUpdateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(RepresentativeEnrollmentUpdateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
