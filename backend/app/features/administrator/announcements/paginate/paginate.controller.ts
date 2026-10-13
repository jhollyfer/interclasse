import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorAnnouncementPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import {
  ANNOUNCEMENT_SORT_COLUMNS,
  AnnouncementPaginateValidator,
} from '#features/administrator/announcements/announcements.validator'

@inject()
export default class AdministratorAnnouncementPaginateController {
  static docs = defineDocs({
    description:
      `\`?sort\` aceita ${ANNOUNCEMENT_SORT_COLUMNS.join(', ')}. ` +
      'Padrão: fixados primeiro, depois do mais novo ao mais antigo.',
  })

  constructor(private readonly useCase: AdministratorAnnouncementPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AnnouncementPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
