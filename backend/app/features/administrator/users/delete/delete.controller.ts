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
    summary: 'Delete user',
    description:
      '**Irreversible**: deletes the database row, and with it the account tokens in ' +
      '`auth_access_tokens` by `CASCADE` - a token is a live credential, and leaving it behind ' +
      'would keep a session that nobody can revoke anymore. The avatar in `storages` stays.\n\n' +
      'Only accepts an already archived user: without that a single click would lose the account without an ' +
      'intermediate step.\n\n' +
      'The **own** account responds `403`, before the archiving requirement.',
    // Declared by hand because it is born in another layer of the chain: it is `UserPolicy` that denies.
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
