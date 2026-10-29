import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorClassroomPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import {
  ClassroomPaginateValidator,
  CLASSROOM_SORT_COLUMNS,
} from '#validators/administrator/classrooms.validator'

@inject()
export default class AdministratorClassroomPaginateController {
  static docs = defineDocs({
    description:
      '`?category` separa Fundamental 1 de Fundamental 2, `?search` filtra pelo nome. ' +
      `\`?sort\` aceita ${CLASSROOM_SORT_COLUMNS.join(', ')}. Padrão: ordenada por nome.`,
  })

  constructor(private readonly useCase: AdministratorClassroomPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(ClassroomPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
