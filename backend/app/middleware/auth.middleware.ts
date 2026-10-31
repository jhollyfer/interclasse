import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { ActorSchema } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'

/**
 * Authenticates the request, denies whoever has no session and leaves in `ctx.actor` whoever
 * acts (_standards/backend.md §4.3). The guard's account is validated against the
 * `shared/` `ActorSchema`: the use case, the policy and Bouncer only know that
 * type, never the model.
 */
export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {},
  ) {
    const user = await ctx.auth.authenticateUsing(options.guards)
    const actor = ActorSchema.safeParse({
      id: user.id,
      role: user.role,
      avatarId: user.avatarId,
    })

    if (!actor.success) {
      throw HTTPException.Unauthorized(ctx.i18n.t('errors.unauthorized'))
    }

    ctx.actor = actor.data

    return next()
  }
}
