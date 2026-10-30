import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorStudentUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdvisorStudentUpdateValidator } from '#validators/advisor/students.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdvisorStudentUpdateController {
  static docs = defineDocs({
    description: 'Corrige o nome. Aluno de turma alheia responde `404`.',
  })

  constructor(private readonly useCase: AdvisorStudentUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(AdvisorStudentUpdateValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({
      ...body,
      ...params,
      actor: context.actor,
    })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
