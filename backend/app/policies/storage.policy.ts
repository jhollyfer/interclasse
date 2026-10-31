import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import { BasePolicy, AuthorizationResponse } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { USER_ROLE, type Actor, type UserRole } from '@interclasse/shared'

import type { Storage } from '#domain/storage/storage.entity'

/**
 * Who downloads which file through the download route.
 *
 * The route exists because the `download` attribute of an `<a>` is ignored across
 * origins; it is not an alternative read path. What the site shows comes out
 * through a signed `url`, derived on reading the resource that contains it - and whoever
 * reaches that resource has already passed its authorization.
 *
 * The administrator downloads everything. The other roles reach only what is theirs - today,
 * their own avatar, which the `actor` already carries, without a query (the policy does not go to
 * the database beyond the target, _standards/architecture.md §2). Closed by default.
 *
 * It receives `(actor, file | null)`. The denial is `404` and not `403`, the same
 * response as a nonexistent file: a 403 would confirm to whoever probes that this
 * uuid exists (_standards/backend.md §4.6).
 */

/**
 * Who operates the administrative panel, and not only their own classroom. Apart from
 * `USER_ROLES` so a new role is born outside: it would enter `USER_ROLE` without
 * entering here, and would be left out of the default check.
 */
const STAFF_USER_ROLES: ReadonlyArray<UserRole> = [USER_ROLE.ADMINISTRATOR]

@inject()
export default class StoragePolicy extends BasePolicy {
  constructor(private readonly i18n: I18n) {
    super()
  }

  download(actor: Actor, storage: Storage | null): AuthorizerResponse {
    if (storage && STAFF_USER_ROLES.includes(actor.role)) return true
    if (storage && actor.avatarId === storage.id) return true

    return AuthorizationResponse.deny(this.i18n.t('files.not_found'), 404).t('STORAGE_NOT_FOUND')
  }
}
