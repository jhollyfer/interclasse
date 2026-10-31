import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import AccountProfileUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AccountProfileUpdateValidator } from '#validators/account/profile.validator'

@inject()
export default class AccountProfileUpdateController {
  static docs = defineDocs({
    summary: 'Update own account',
    description:
      'Every field is optional: only what comes in the payload changes. A missing field means ' +
      '"leave alone", not "erase" - the exception is `avatarId`, where `null` is how the photo is removed ' +
      'without replacing it.\n\n' +
      'Changing the password requires `currentPassword`, the current password: the session proves possession of the cookie, ' +
      "not identity, and without it a hijacked cookie would change the account owner's password. The " +
      'new password must still differ from the current one.\n\n' +
      'Changing email or password **revokes all sessions**, including the one that made this ' +
      'request.\n\n' +
      'The role is not accepted: it is set at creation, by the administrator, and nobody changes their ' +
      'own.',
  })

  constructor(private readonly useCase: AccountProfileUpdateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AccountProfileUpdateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
