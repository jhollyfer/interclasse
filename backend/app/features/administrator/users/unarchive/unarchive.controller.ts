import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserUnarchiveUseCase from './unarchive.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorUserUnarchiveController {
  static docs = defineDocs({
    summary: 'Restore user',
    description:
      'Takes out of the trash: zeroes `deletedAt`. Only accepts an archived user - a live user ' +
      'responds `409`. No session is recreated: whoever was restored signs in again through ' +
      'sign-in.',
  })

  constructor(private readonly useCase: AdministratorUserUnarchiveUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
