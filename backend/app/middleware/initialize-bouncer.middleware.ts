import { Bouncer } from '@adonisjs/bouncer'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Actor } from '@interclasse/shared'

import { policies } from '#generated/policies'
import * as abilities from '#abilities/main'

/**
 * Monta o `ctx.bouncer` que os controllers usam para checar policy
 * (_standards/backend.md §4.6). Sem Edge neste projeto, então sem helpers de view.
 */
export default class InitializeBouncerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Uma instância por requisição, inicializada com o `actor` que o
     * `auth.middleware.ts` valida - lido na hora da checagem, e não aqui, porque
     * este middleware roda antes do auth. É o composition root do Bouncer - o
     * único `new Bouncer` do projeto (_standards/backend.md §2.1).
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
