import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorStudentPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdvisorStudentPaginateValidator } from '#validators/advisor/students.validator'

@inject()
export default class AdvisorStudentPaginateController {
  static docs = defineDocs({
    description:
      'The students of the advisor classrooms, in alphabetical order. `?classroomId` narrows to one ' +
      'classroom only; a classroom of another advisor responds empty.',
  })

  constructor(private readonly useCase: AdvisorStudentPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdvisorStudentPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
