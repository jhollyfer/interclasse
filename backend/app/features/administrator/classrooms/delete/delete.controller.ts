import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import AdministratorClassroomDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorClassroomDeleteController {
  static docs = defineDocs({
    description:
      '**Irreversível**: apaga a turma com os alunos e as inscrições dela. Turma que já está ' +
      'numa chave sorteada responde `409` - apague a chave antes.',
  })

  constructor(private readonly useCase: AdministratorClassroomDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await IdentifierValidator.validate(context.params)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
