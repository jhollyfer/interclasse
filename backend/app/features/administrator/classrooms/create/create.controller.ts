import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorClassroomCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorClassroomCreateValidator } from '#validators/administrator/classrooms.validator'

@inject()
export default class AdministratorClassroomCreateController {
  static docs = defineDocs({
    description:
      'The category (`F1` or `F2`) comes from the year and is not sent. Advisor and representative are ' +
      'optional and must have the link role; a representative has only one classroom.',
  })

  constructor(private readonly useCase: AdministratorClassroomCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorClassroomCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
