import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorClassroomUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorClassroomUpdateValidator } from '#validators/administrator/classrooms.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorClassroomUpdateController {
  static docs = defineDocs({
    description:
      'A missing field means "leave alone"; `null` on advisor or representative undoes the link. ' +
      'Changing the year to another category responds `409` if the classroom is already in a drawn bracket.',
  })

  constructor(private readonly useCase: AdministratorClassroomUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(AdministratorClassroomUpdateValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
