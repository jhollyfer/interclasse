import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdvisorEnrollmentShowUseCase from './show.use-case.ts'
import { AdvisorEnrollmentShowValidator } from '#core/validator'

@inject()
export default class AdvisorEnrollmentShowController {
  static docs = defineDocs({
    description:
      'A matriz aluno x modalidade de uma turma do conselheiro: quem está inscrito em quê, e ' +
      'quais modalidades já travaram pelo sorteio.',
  })

  constructor(private readonly useCase: AdvisorEnrollmentShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await AdvisorEnrollmentShowValidator.validate(context.request.qs())
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
