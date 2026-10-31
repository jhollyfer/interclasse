import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorPhotoPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdvisorPhotoPaginateValidator } from '#validators/advisor/photos.validator'

@inject()
export default class AdvisorPhotoPaginateController {
  static docs = defineDocs({
    description:
      'The photos the logged user submitted, newest to oldest, with the review `status`: ' +
      '`PENDING` waits, `APPROVED` is on the site, `REJECTED` was refused.',
  })

  constructor(private readonly useCase: AdvisorPhotoPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdvisorPhotoPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
