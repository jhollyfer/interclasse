import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdministratorAnnouncementCreateUseCase from './create.use-case.ts'
import { AnnouncementCreateValidator } from '#features/administrator/announcements/announcements.validator'

@inject()
export default class AdministratorAnnouncementCreateController {
  static docs = defineDocs({
    description: 'Publica na hora: o aviso aparece no site assim que é criado.',
  })

  constructor(private readonly useCase: AdministratorAnnouncementCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AnnouncementCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
