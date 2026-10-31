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
    summary: 'Archive user',
    description:
      'Sends to the trash: saves `deletedAt` and **revokes all the account sessions**. The ' +
      'guard does not know `deleted_at`, so without the revocation the archived user would stay inside the ' +
      'panel until the token expired.\n\n' +
      'The account disappears from the default listings and reappears with `?trashed=only`. Reversible by ' +
      '`PATCH /:id/unarchive`. An already archived user responds `409`.\n\n' +
      'The **own** account responds `403`: archiving oneself removes from the panel whoever was ' +
      'administering, and the fix would be to run the seeder.',
    // Declared by hand because it is born in another layer of the chain: it is `UserPolicy` that denies.
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
