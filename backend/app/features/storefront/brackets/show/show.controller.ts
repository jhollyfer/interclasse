import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorefrontBracketShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class StorefrontBracketShowController {
  static docs = defineDocs({
    description:
      'Without a session. The whole bracket: every match of each phase, with the classroom names ' +
      'and the champion when the final ends.',
  })

  constructor(private readonly useCase: StorefrontBracketShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
