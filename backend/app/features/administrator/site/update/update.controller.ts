import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorSiteUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorSiteUpdateValidator } from '#validators/administrator/site.validator'

@inject()
export default class AdministratorSiteUpdateController {
  static docs = defineDocs({
    summary: 'Update site configuration',
    description:
      'A missing field means "leave alone"; `null` erases. `regulationId` is a file already ' +
      'uploaded through `/storages` and must be a PDF.',
  })

  constructor(private readonly useCase: AdministratorSiteUpdateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorSiteUpdateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
