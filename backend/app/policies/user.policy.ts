import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import { BasePolicy, AuthorizationResponse } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import type { Actor } from '@interclasse/shared'

import type { User } from '#domain/user/user.entity'

/**
 * Who can operate which account in the panel.
 *
 * It is the half that `role.middleware` cannot express. It looks only at the role
 * of **whoever calls**, and the rule here depends on **who the target is**: an
 * administrator operates accounts, but not their own through this resource.
 *
 * Bouncer's `BasePolicy`, checked by the controller with `ctx.bouncer`
 * (_standards/backend.md §4.6, _doc-lib/adonisjs.md#guides/auth/authorization).
 * It receives `(actor, account | null)`: a nonexistent account denies with `404`, the same
 * `USER_NOT_FOUND` as the use case. The denial becomes `AuthorizationException`, which
 * `handler.ts` translates into the envelope; the translation identifier is the `code`.
 * The message comes out through the request's `I18n`.
 *
 * **No owner rule**: here the roles are `ADMINISTRATOR`, `ADVISOR` and
 * `REPRESENTATIVE`, and there is no `OWNER` to protect.
 */
@inject()
export default class UserPolicy extends BasePolicy {
  constructor(private readonly i18n: I18n) {
    super()
  }

  /**
   * The role and status of the account itself are not changed through here: without the guard an
   * administrator demotes themselves or marks themselves `INACTIVE` and loses the panel. Name and
   * e-mail remain editable, because neither locks anyone out.
   *
   * The presence of the field is enough, without comparing with the current value: sending
   * the same role back is not an edit.
   */
  update(
    actor: Actor,
    target: User | null,
    changes: { readonly role?: unknown; readonly status?: unknown },
  ): AuthorizerResponse {
    if (!target) return this.notFound()
    if (actor.id !== target.id) return true
    if (changes.role === undefined && changes.status === undefined) return true

    return AuthorizationResponse.deny(this.i18n.t('users.self_access_forbidden'), 403).t(
      'SELF_ACCESS_FORBIDDEN',
    )
  }

  archive(actor: Actor, target: User | null): AuthorizerResponse {
    if (!target) return this.notFound()
    if (actor.id !== target.id) return true

    return AuthorizationResponse.deny(this.i18n.t('users.self_archive_forbidden'), 403).t(
      'SELF_ARCHIVE_FORBIDDEN',
    )
  }

  delete(actor: Actor, target: User | null): AuthorizerResponse {
    if (!target) return this.notFound()
    if (actor.id !== target.id) return true

    return AuthorizationResponse.deny(this.i18n.t('users.self_delete_forbidden'), 403).t(
      'SELF_DELETE_FORBIDDEN',
    )
  }

  private notFound(): AuthorizerResponse {
    return AuthorizationResponse.deny(this.i18n.t('users.not_found'), 404).t('USER_NOT_FOUND')
  }
}
