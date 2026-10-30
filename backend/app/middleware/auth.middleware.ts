import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { ActorSchema } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'

/**
 * Autentica a requisição, nega quem não tem sessão e deixa em `ctx.actor` quem
 * age (_standards/backend.md §4.3). A conta do guard é validada contra o
 * `ActorSchema` do `shared/`: o use-case, a policy e o Bouncer só conhecem esse
 * tipo, nunca o model.
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
      throw HTTPException.Unauthorized(ctx.i18n.t('errors.unauthorized'), 'UNAUTHORIZED')
    }

    ctx.actor = actor.data

    return next()
  }
}
