import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdvisorEnrollmentUpdateUseCase from './update.use-case.ts'
import { AdvisorEnrollmentUpdateValidator } from '#core/validator'

@inject()
export default class AdvisorEnrollmentUpdateController {
  static docs = defineDocs({
    description:
      'Troca a lista de atletas da turma numa modalidade pela enviada, inteira. Responde a ' +
      'matriz atualizada. Depois do sorteio da modalidade na categoria da turma, `409`.',
    // Nascem no `EnrollmentService`, fora da leitura de AST do gerador.
    errors: {
      409: 'ENROLLMENT_LOCKED',
      422: ['SPORT_NOT_FOUND', 'STUDENT_NOT_FOUND', 'ENROLLMENT_LIMIT_EXCEEDED'],
    },
  })

  constructor(private readonly useCase: AdvisorEnrollmentUpdateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdvisorEnrollmentUpdateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.auth.user! })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
