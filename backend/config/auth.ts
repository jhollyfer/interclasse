import { defineConfig } from '@adonisjs/auth'
import type { InferAuthenticators, InferAuthEvents, Authenticators } from '@adonisjs/auth/types'

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
