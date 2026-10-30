import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserUnarchiveUseCase from './unarchive.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorUserUnarchiveController {
  static docs = defineDocs({
    summary: 'Restaurar usuário',
    description:
      'Tira da lixeira: zera `deletedAt`. Só aceita usuário arquivado - um usuário vivo ' +
      'responde `409`. Nenhuma sessão é recriada: quem foi restaurado entra de novo pelo ' +
      'sign-in.',
  })

  constructor(private readonly useCase: AdministratorUserUnarchiveUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
