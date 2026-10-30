import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorEnrollmentShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdvisorEnrollmentShowValidator } from '#validators/advisor/enrollments.validator'

@inject()
export default class AdvisorEnrollmentShowController {
  static docs = defineDocs({
    description:
      'A matriz aluno x modalidade de uma turma do conselheiro: quem está inscrito em quê, e ' +
      'quais modalidades já travaram pelo sorteio. Turma alheia ou ausente responde `404`.',
  })

  constructor(private readonly useCase: AdvisorEnrollmentShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdvisorEnrollmentShowValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
