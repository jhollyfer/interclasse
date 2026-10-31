import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorefrontBracketPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StorefrontBracketPaginateValidator } from '#validators/storefront/brackets.validator'

@inject()
export default class StorefrontBracketPaginateController {
  static docs = defineDocs({
    description: 'The drawn brackets, with the sport. It is the index of the standings page.',
  })

  constructor(private readonly useCase: StorefrontBracketPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(StorefrontBracketPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
