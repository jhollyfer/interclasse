import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import UserPolicy from '#policies/user.policy'
import { UserRepository } from '#repositories/user/user.repository'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorUserDeleteController {
  static docs = defineDocs({
    summary: 'Apagar usuário',
    description:
      '**Irreversível**: apaga a linha do banco, e com ela os tokens da conta em ' +
      '`auth_access_tokens` por `CASCADE` - token é credencial viva, e deixá-lo para trás ' +
      'manteria uma sessão que ninguém mais consegue revogar. O avatar em `storages` fica.\n\n' +
      'Só aceita usuário já arquivado: sem isso um clique perderia a conta sem escala ' +
      'intermediária.\n\n' +
      'A **própria** conta responde `403`, antes da exigência de arquivamento.',
    // Declarado à mão porque nasce em outra camada da cadeia: quem nega é a `UserPolicy`.
    errors: { 403: 'SELF_DELETE_FORBIDDEN' },
  })

  constructor(
    private readonly useCase: AdministratorUserDeleteUseCase,
    private readonly users: UserRepository,
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const user = await this.users.findAnyById(payload.id)
    await context.bouncer.with(UserPolicy).authorize('delete', user)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
