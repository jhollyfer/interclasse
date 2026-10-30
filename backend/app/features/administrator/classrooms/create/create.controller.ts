import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorClassroomCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorClassroomCreateValidator } from '#validators/administrator/classrooms.validator'

@inject()
export default class AdministratorClassroomCreateController {
  static docs = defineDocs({
    description:
      'A categoria (`F1` ou `F2`) sai do ano e não é enviada. Conselheiro e representante são ' +
      'opcionais e precisam ter o papel do vínculo; um representante só tem uma turma.',
    // Nascem na entidade e são traduzidos em `_shared.classroom-refusal.ts`, fora da
    // pasta da ação: o introspector não os lê sozinho.
    errors: {
      409: ['ADVISOR_TAKEN', 'REPRESENTATIVE_TAKEN'],
      422: ['ADVISOR_NOT_FOUND', 'REPRESENTATIVE_NOT_FOUND', 'CLASSROOM_INVALID_GRADE'],
    },
  })

  constructor(private readonly useCase: AdministratorClassroomCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorClassroomCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
