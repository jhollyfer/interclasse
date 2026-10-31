import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import UserPolicy from '#policies/user.policy'
import { UserRepository } from '#repositories/user/user.repository'
import { AdministratorUserUpdateValidator } from '#validators/administrator/users.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorUserUpdateController {
  static docs = defineDocs({
    summary: 'Update user',
    description:
      'Every field is optional: only what comes in the payload changes. A missing field means ' +
      '"leave alone", not "erase" - the exception is `avatarId`, where `null` is how the photo is removed ' +
      'without replacing it.\n\n' +
      '`role` is accepted here, unlike `PUT /account`: promoting and demoting is what this ' +
      'resource exists to do.\n\n' +
      'Changing email or password **drops all sessions** of the changed account - without that, ' +
      "switching someone's access off would switch nothing off. The response never carries the password.\n\n" +
      'On the **own** account, `role` and `status` respond `403`: demoting oneself to advisor or ' +
      'marking oneself `INACTIVE` removes from the panel whoever was administering. Name, email, password and ' +
      'photo remain editable.',
    // Declared by hand because it is born in another layer of the chain: it is `UserPolicy` that denies.
    errors: { 403: 'SELF_ACCESS_FORBIDDEN' },
  })

  constructor(
    private readonly useCase: AdministratorUserUpdateUseCase,
    private readonly users: UserRepository,
  ) {}

  async handle(context: HttpContext) {
    // Body and params validated separately and merged: the `:id` comes from the URL and
    // not from the payload, and a single schema would accept an `id` in the body able to
    // point at another row.
    const body = await context.request.validateUsing(AdministratorUserUpdateValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const user = await this.users.findById(params.id)
    await context.bouncer.with(UserPolicy).authorize('update', user, body)
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
