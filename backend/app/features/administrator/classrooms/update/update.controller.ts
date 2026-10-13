import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdministratorClassroomUpdateUseCase from './update.use-case.ts'
import { ClassroomUpdateValidator } from '#features/administrator/classrooms/classrooms.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorClassroomUpdateController {
  static docs = defineDocs({
    description:
      'Campo ausente é "não mexer"; `null` em conselheiro ou representante desfaz o vínculo. ' +
      'Trocar o ano para outra categoria responde `409` se a turma já está numa chave sorteada.',
    // Nascem no `ClassroomService`, fora da leitura de AST do gerador.
    errors: {
      409: 'REPRESENTATIVE_TAKEN',
      422: ['ADVISOR_NOT_FOUND', 'REPRESENTATIVE_NOT_FOUND'],
    },
  })

  constructor(private readonly useCase: AdministratorClassroomUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await ClassroomUpdateValidator.validate(context.request.body())
    const params = await IdentifierValidator.validate(context.request.params())
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
