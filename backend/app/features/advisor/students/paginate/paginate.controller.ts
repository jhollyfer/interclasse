import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorStudentPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StudentPaginateValidator } from '#features/advisor/students/students.validator'

@inject()
export default class AdvisorStudentPaginateController {
  static docs = defineDocs({
    description:
      'Os alunos das turmas do conselheiro, em ordem alfabética. `?classroomId` recorta uma ' +
      'turma só; turma de outro conselheiro responde vazio.',
  })

  constructor(private readonly useCase: AdvisorStudentPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await StudentPaginateValidator.validate(context.request.qs())
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
