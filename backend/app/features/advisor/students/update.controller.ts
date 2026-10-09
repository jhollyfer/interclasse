import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdvisorStudentUpdateUseCase from './update.use-case.ts'
import { AdvisorStudentUpdateValidator, IdentifierValidator } from '#core/validator'

@inject()
export default class AdvisorStudentUpdateController {
  static docs = defineDocs({
    description: 'Corrige o nome. Aluno de turma alheia responde `404`.',
  })

  constructor(private readonly useCase: AdvisorStudentUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await AdvisorStudentUpdateValidator.validate(context.request.body())
    const params = await IdentifierValidator.validate(context.request.params())
    const result = await this.useCase.execute({ ...body, ...params, actor: context.auth.user! })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
