import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorEnrollmentUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdvisorEnrollmentUpdateValidator } from '#validators/advisor/enrollments.validator'

@inject()
export default class AdvisorEnrollmentUpdateController {
  static docs = defineDocs({
    description:
      'Troca a lista de atletas da turma numa modalidade pela enviada, inteira. Responde a ' +
      'matriz atualizada. Vale também depois do sorteio: o time sorteado é a turma. Tirar ' +
      'atleta exige `reason`, que vira aviso para a organização. Turma alheia responde `404`.',
  })

  constructor(private readonly useCase: AdvisorEnrollmentUpdateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdvisorEnrollmentUpdateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
