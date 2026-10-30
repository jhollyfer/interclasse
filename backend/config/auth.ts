import { defineConfig } from '@adonisjs/auth'
import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session'
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
     * Sessão da API, transportada em cookie `httpOnly`. Reaproveita a
     * maquinaria nativa de access tokens opacos do Adonis e troca o
     * transporte: nada de cabeçalho `Authorization`.
     */
    api: cookieAccessTokensGuard(),

    /**
     * Session-based guard for browser authentication.
     */
    web: sessionGuard({
      /**
       * Enable persistent login using remember-me tokens.
       */
      useRememberMeTokens: false,

      provider: sessionUserProvider({
        model: () => import('#models/user'),
      }),
    }),
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
 * Quem age na requisição, posto pelo `auth.middleware.ts` depois de validar a
 * conta contra o `ActorSchema` (_standards/backend.md §4.3). Declarado aqui, num
 * arquivo só de tipo e config, pelo mesmo motivo do `ctx.i18n`
 * (`config/i18n.ts`).
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    actor: Actor
  }
}
