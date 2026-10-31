import { Bouncer } from '@adonisjs/bouncer'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Actor } from '@interclasse/shared'

import { policies } from '#generated/policies'
import * as abilities from '#abilities/main'

/**
 * Builds the `ctx.bouncer` the controllers use to check policies
 * (_standards/backend.md §4.6). No Edge in this project, so no view helpers.
 */
export default class InitializeBouncerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * One instance per request, initialized with the `actor` that
     * `auth.middleware.ts` validates - read at check time, and not here, because
     * this middleware runs before auth. It is Bouncer's composition root - the
     * only `new Bouncer` in the project (_standards/backend.md §2.1).
     */
    ctx.bouncer = new Bouncer(() => ctx.actor, abilities, policies).setContainerResolver(
      ctx.containerResolver,
    )

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    bouncer: Bouncer<Actor, typeof abilities, typeof policies>
  }
}
