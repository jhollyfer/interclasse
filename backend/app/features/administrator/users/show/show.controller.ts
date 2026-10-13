import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorUserShowController {
  static docs = defineDocs({
    summary: 'Ver um usuário',
    description:
      'Devolve o objeto nu, sem envelope, com a foto aninhada e **sem a senha**. Usuário ' +
      'arquivado não é encontrado aqui - para alcançá-lo, liste com `?trashed`.',
  })

  constructor(private readonly useCase: AdministratorUserShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await IdentifierValidator.validate(context.params)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
