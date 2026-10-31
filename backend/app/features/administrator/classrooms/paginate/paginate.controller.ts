import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorClassroomPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import {
  AdministratorClassroomPaginateValidator,
  CLASSROOM_SORT_COLUMNS,
} from '#validators/administrator/classrooms.validator'

@inject()
export default class AdministratorClassroomPaginateController {
  static docs = defineDocs({
    description:
      '`?category` separates Fundamental 1 from Fundamental 2, `?search` filters by name. ' +
      `\`?sort\` accepts ${CLASSROOM_SORT_COLUMNS.join(', ')}. Default: ordered by name.`,
  })

  constructor(private readonly useCase: AdministratorClassroomPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorClassroomPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
