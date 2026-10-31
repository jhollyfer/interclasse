import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorUserShowController {
  static docs = defineDocs({
    summary: 'View a user',
    description:
      'Returns the bare object, without envelope, with the nested photo and **without the password**. An ' +
      'archived user is not found here - to reach it, list with `?trashed`.',
  })

  constructor(private readonly useCase: AdministratorUserShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
