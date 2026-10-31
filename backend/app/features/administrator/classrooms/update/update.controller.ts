import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorClassroomUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorClassroomUpdateValidator } from '#validators/administrator/classrooms.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorClassroomUpdateController {
  static docs = defineDocs({
    description:
      'Campo ausente é "não mexer"; `null` em conselheiro ou representante desfaz o vínculo. ' +
      'Trocar o ano para outra categoria responde `409` se a turma já está numa chave sorteada.',
  })

  constructor(private readonly useCase: AdministratorClassroomUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(AdministratorClassroomUpdateValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
