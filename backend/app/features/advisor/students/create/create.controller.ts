import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorStudentCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdvisorStudentCreateValidator } from '#validators/advisor/students.validator'

@inject()
export default class AdvisorStudentCreateController {
  static docs = defineDocs({
    description: 'Cadastra o aluno numa turma do conselheiro. Turma alheia responde `404`.',
  })

  constructor(private readonly useCase: AdvisorStudentCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdvisorStudentCreateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
