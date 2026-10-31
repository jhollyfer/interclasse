import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorefrontMatchPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StorefrontMatchPaginateValidator } from '#validators/storefront/matches.validator'

@inject()
export default class StorefrontMatchPaginateController {
  static docs = defineDocs({
    description:
      'The site match table: the upcoming matches with `?status=SCHEDULED`, the ' +
      'results with `?status=FINISHED`. Same order and filters as the panel.',
  })

  constructor(private readonly useCase: StorefrontMatchPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(StorefrontMatchPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
