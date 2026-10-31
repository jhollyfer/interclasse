import { defineConfig } from '@adonisjs/auth'
import type { InferAuthenticators, InferAuthEvents, Authenticators } from '@adonisjs/auth/types'
import type { Actor } from '@interclasse/shared'

import { cookieAccessTokensGuard } from '#guards/cookie-access-tokens.guard'

const authConfig = defineConfig({
  /**
   * Default guard used when no guard is explicitly specified.
   */
  default: 'api',

  guards: {
    /**
     * API session, carried in an `httpOnly` cookie. Reuses Adonis' native
     * machinery of opaque access tokens and swaps the
     * transport: no `Authorization` header.
     */
    api: cookieAccessTokensGuard(),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}

/**
 * Who acts in the request, set by `auth.middleware.ts` after validating the
 * account against the `ActorSchema` (_standards/backend.md §4.3). Declared here, in a
 * type-and-config-only file, for the same reason as `ctx.i18n`
 * (`config/i18n.ts`).
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    actor: Actor
  }
}
