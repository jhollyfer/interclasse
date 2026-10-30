import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserArchiveUseCase from './archive.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import UserPolicy from '#policies/user.policy'
import { UserRepository } from '#repositories/user/user.repository'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorUserArchiveController {
  static docs = defineDocs({
    summary: 'Arquivar usuário',
    description:
      'Envia para a lixeira: grava `deletedAt` e **revoga todas as sessões da conta**. O ' +
      'guard não conhece `deleted_at`, então sem a revogação o arquivado seguiria dentro do ' +
      'painel até o token vencer.\n\n' +
      'A conta some das listagens padrão e reaparece com `?trashed=only`. Reversível por ' +
      '`PATCH /:id/unarchive`. Usuário já arquivado responde `409`.\n\n' +
      'A **própria** conta responde `403`: arquivar a si mesmo tira do painel quem estava ' +
      'administrando, e o conserto seria rodar o seeder.',
    // Declarado à mão porque nasce fora deste par: quem nega é a `UserPolicy`.
    errors: { 403: 'SELF_ARCHIVE_FORBIDDEN' },
  })

  constructor(
    private readonly useCase: AdministratorUserArchiveUseCase,
    private readonly users: UserRepository,
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const user = await this.users.findAnyById(payload.id)
    await context.bouncer.with(UserPolicy).authorize('archive', user)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
