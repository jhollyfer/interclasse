import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdministratorAnnouncementUpdateUseCase from './update.use-case.ts'
import { AnnouncementUpdateValidator } from '#features/administrator/announcements/announcements.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorAnnouncementUpdateController {
  static docs = defineDocs({
    description: 'Campo ausente é "não mexer": só o que vier no payload muda.',
  })

  constructor(private readonly useCase: AdministratorAnnouncementUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await AnnouncementUpdateValidator.validate(context.request.body())
    const params = await IdentifierValidator.validate(context.request.params())
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
