import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorEnrollmentRemovalPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { EnrollmentRemovalPaginateValidator } from '#validators/administrator/enrollment-removals.validator'

@inject()
export default class AdministratorEnrollmentRemovalPaginateController {
  static docs = defineDocs({
    summary: 'Listar avisos de remoção de atleta',
    description:
      'Cada atleta que o conselheiro tirou de uma modalidade, com o motivo. ' +
      '`?pending=true` traz só os que ainda não tiveram ciência.',
  })

  constructor(private readonly useCase: AdministratorEnrollmentRemovalPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(EnrollmentRemovalPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
