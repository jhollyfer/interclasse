import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { type UserRole } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'

/**
 * Refuses whoever reaches a module whose role is not theirs.
 *
 * Applied on the route **group**, never on the endpoint: a new endpoint is born
 * protected by the module it was placed in, without depending on someone remembering to
 * annotate it.
 *
 * Always runs after `middleware.auth()`. The order matters: without a session the role
 * of the requester is unknown, so the correct answer is `401`, and it is `auth`
 * that returns it. The `403` here only makes sense when it is already known who is
 * calling - unlike data scope, which answers "not found" so as
 * not to confirm the resource exists.
 */
export default class RoleMiddleware {
  async handle(context: HttpContext, next: NextFn, roles: ReadonlyArray<UserRole>) {
    const user = context.auth.user

    // `schema.ts` is generated from the database and types `role` as `string`. Widening the list
    // to `readonly string[]` is a safe assignment - comparing with `as UserRole`
    // would lie to the compiler about a value that comes from the database.
    const allowed: readonly string[] = roles

    if (!user || !allowed.includes(user.role)) {
      throw HTTPException.Forbidden(context.i18n.t('errors.access_denied'), 'ACCESS_DENIED')
    }

    return next()
  }
}
