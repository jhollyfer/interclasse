import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorBracketPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorBracketPaginateValidator } from '#validators/administrator/brackets.validator'

@inject()
export default class AdministratorBracketPaginateController {
  static docs = defineDocs({
    description: 'The drawn brackets, from newest to oldest.',
  })

  constructor(private readonly useCase: AdministratorBracketPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorBracketPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
