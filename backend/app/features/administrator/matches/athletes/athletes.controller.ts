import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorMatchAthletesUseCase from './athletes.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorMatchAthletesController {
  static docs = defineDocs({
    summary: 'Listar atletas da partida',
    description:
      'Os alunos das duas turmas da partida, com os inscritos na modalidade marcados. É de ' +
      'onde sai o atleta de um cartão.',
  })

  constructor(private readonly useCase: AdministratorMatchAthletesUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
