import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorUserCreateValidator } from '#validators/administrator/users.validator'

@inject()
export default class AdministratorUserCreateController {
  static docs = defineDocs({
    summary: 'Create user',
    description:
      'Returns `201` with the created account, bare object, without envelope and **without the password**.\n\n' +
      'The only way to create a user in the API: there is no public sign-up, and the first ' +
      'administrator comes from the seeder.\n\n' +
      '`role` is required - the role is always explicit on the server. `password` requires ' +
      '`passwordConfirmation` with the same value.\n\n' +
      'The email of a live account responds `409`. The email of an **archived** account reactivates ' +
      'that row with the new data: `email` is a global `UNIQUE`, and inserting again ' +
      'would hit the index.',
  })

  constructor(private readonly useCase: AdministratorUserCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorUserCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
