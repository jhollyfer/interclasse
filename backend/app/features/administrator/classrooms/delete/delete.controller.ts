import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorClassroomDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorClassroomDeleteController {
  static docs = defineDocs({
    description:
      '**Irreversible**: deletes the classroom with its students and their enrollments. A classroom already ' +
      'in a drawn bracket responds `409` - delete the bracket first.',
  })

  constructor(private readonly useCase: AdministratorClassroomDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
