import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorAnnouncementCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorAnnouncementCreateValidator } from '#validators/administrator/announcements.validator'

@inject()
export default class AdministratorAnnouncementCreateController {
  static docs = defineDocs({
    description: 'Publica na hora: o aviso aparece no site assim que é criado.',
  })

  constructor(private readonly useCase: AdministratorAnnouncementCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorAnnouncementCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
