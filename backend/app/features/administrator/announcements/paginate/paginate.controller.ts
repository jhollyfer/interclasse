import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorAnnouncementPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import {
  ANNOUNCEMENT_SORT_COLUMNS,
  AdministratorAnnouncementPaginateValidator,
} from '#validators/administrator/announcements.validator'

@inject()
export default class AdministratorAnnouncementPaginateController {
  static docs = defineDocs({
    description:
      `\`?sort\` accepts ${ANNOUNCEMENT_SORT_COLUMNS.join(', ')}. ` +
      'Default: pinned first, then newest to oldest.',
  })

  constructor(private readonly useCase: AdministratorAnnouncementPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      AdministratorAnnouncementPaginateValidator,
      {
        data: context.request.qs(),
      },
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
