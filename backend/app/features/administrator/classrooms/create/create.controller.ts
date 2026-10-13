import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import AdministratorClassroomCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { ClassroomCreateValidator } from '#features/administrator/classrooms/classrooms.validator'

@inject()
export default class AdministratorClassroomCreateController {
  static docs = defineDocs({
    description:
      'A categoria (`F1` ou `F2`) sai do ano e não é enviada. Conselheiro e representante são ' +
      'opcionais e precisam ter o papel do vínculo; um representante só tem uma turma.',
    // Nascem no `ClassroomService`, fora da leitura de AST do gerador.
    errors: {
      409: 'REPRESENTATIVE_TAKEN',
      422: ['ADVISOR_NOT_FOUND', 'REPRESENTATIVE_NOT_FOUND'],
    },
  })

  constructor(private readonly useCase: AdministratorClassroomCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(ClassroomCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
