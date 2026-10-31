import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorEnrollmentRemovalPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorEnrollmentRemovalPaginateValidator } from '#validators/administrator/enrollment-removals.validator'

@inject()
export default class AdministratorEnrollmentRemovalPaginateController {
  static docs = defineDocs({
    summary: 'List athlete removal notices',
    description:
      'Each athlete the advisor removed from a sport, with the reason. ' +
      '`?pending=true` brings only those not yet acknowledged.',
  })

  constructor(private readonly useCase: AdministratorEnrollmentRemovalPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      AdministratorEnrollmentRemovalPaginateValidator,
      {
        data: context.request.qs(),
      },
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
