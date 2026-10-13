import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorefrontAnnouncementPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { PaginationValidator } from '#core/validator'

@inject()
export default class StorefrontAnnouncementPaginateController {
  static docs = defineDocs({
    description: 'Os avisos dos jogos: fixados primeiro, depois do mais novo ao mais antigo.',
  })

  constructor(private readonly useCase: StorefrontAnnouncementPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(PaginationValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
