import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { USER_ROLE } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'

/** Who operates the panel. */
const STAFF: ReadonlyArray<string> = [USER_ROLE.ADMINISTRATOR]

/**
 * The API reference only exists for whoever operates the installation.
 *
 * The document describes the **whole** surface: every route, every parameter, every
 * body shape and every error code. Publishing it without a session hands the complete
 * map to whoever has not signed in yet.
 *
 * **404 and not 403**: a 403 would confirm that the route exists and that a role reaches it. For
 * whoever cannot see it, it simply is not there.
 *
 * It depends on `silent-auth.middleware`, which already runs earlier in the router stack and
 * populates `auth.user` when there is a valid cookie without refusing whoever has none.
 */
export default class DocumentationMiddleware {
  async handle(context: HttpContext, next: NextFn) {
    const user = context.auth.user

    if (!user) throw this.notFound(context)

    if (!STAFF.includes(user.role)) throw this.notFound(context)

    return next()
  }

  private notFound(context: HttpContext) {
    return HTTPException.NotFound(context.i18n.t('errors.not_found'), 'RESOURCE_NOT_FOUND')
  }
}
