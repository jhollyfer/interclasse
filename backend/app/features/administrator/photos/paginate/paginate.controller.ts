import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPhotoPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorPhotoPaginateValidator } from '#validators/administrator/photos.validator'

@inject()
export default class AdministratorPhotoPaginateController {
  static docs = defineDocs({
    description:
      'The submitted photos, newest to oldest, with who submitted them. `?status=PENDING` ' +
      'is the queue of what awaits review.',
  })

  constructor(private readonly useCase: AdministratorPhotoPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorPhotoPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
