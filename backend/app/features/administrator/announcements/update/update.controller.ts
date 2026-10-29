import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorAnnouncementUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorAnnouncementUpdateValidator } from '#validators/administrator/announcements.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorAnnouncementUpdateController {
  static docs = defineDocs({
    description: 'Campo ausente é "não mexer": só o que vier no payload muda.',
  })

  constructor(private readonly useCase: AdministratorAnnouncementUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(AdministratorAnnouncementUpdateValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
