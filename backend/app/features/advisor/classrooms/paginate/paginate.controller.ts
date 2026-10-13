import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorClassroomPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { PaginationValidator } from '#core/validator'

@inject()
export default class AdvisorClassroomPaginateController {
  static docs = defineDocs({
    description:
      'As turmas que o conselheiro aconselha. O administrador, que também entra aqui, vê todas.',
  })

  constructor(private readonly useCase: AdvisorClassroomPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await PaginationValidator.validate(context.request.qs())
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
