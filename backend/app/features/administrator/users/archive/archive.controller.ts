import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import AdministratorUserArchiveUseCase from './archive.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import UserPolicy from '#policies/user.policy'
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
      '`PATCH /:id/unarchive`. Usuário já arquivado responde `404`.\n\n' +
      'A **própria** conta responde `403`: arquivar a si mesmo tira do painel quem estava ' +
      'administrando, e o conserto seria rodar o seeder.',
    // Declarado à mão porque nasce fora deste par: quem nega é a `UserPolicy`.
    errors: { 403: 'SELF_ARCHIVE_FORBIDDEN' },
  })

  constructor(private readonly useCase: AdministratorUserArchiveUseCase) {}

  async handle(context: HttpContext) {
    const payload = await IdentifierValidator.validate(context.params)
    await context.bouncer.with(UserPolicy).authorize('archive', payload.id)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
