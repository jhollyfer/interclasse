import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorefrontSportPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { PaginationValidator } from '#core/validator'

@inject()
export default class StorefrontSportPaginateController {
  static docs = defineDocs({
    description: 'As modalidades dos jogos, em ordem alfabética. Sem sessão.',
  })

  constructor(private readonly useCase: StorefrontSportPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(PaginationValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
