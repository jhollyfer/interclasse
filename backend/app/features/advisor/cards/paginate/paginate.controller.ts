import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorCardPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdvisorCardPaginateValidator } from '#validators/advisor/cards.validator'

@inject()
export default class AdvisorCardPaginateController {
  static docs = defineDocs({
    description:
      'Os cartões que os atletas da turma levaram, do mais novo ao mais antigo. Turma ' +
      'alheia responde `404`.',
  })

  constructor(private readonly useCase: AdvisorCardPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdvisorCardPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
