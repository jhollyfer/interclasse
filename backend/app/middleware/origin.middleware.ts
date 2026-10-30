import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import HTTPException from '#exceptions/http.exception'
import { corsOrigins } from '#config/cors'

/**
 * A barreira de CSRF da API, que autentica por cookie.
 *
 * `SameSite=Lax` não basta: um subdomínio irmão comprometido é *same-site* e
 * envia o cookie. Por isso todo método que não é `GET`/`HEAD`/`OPTIONS` confere
 * a origem contra a mesma allowlist do CORS, **antes do bodyparser**
 * (_standards/backend.md §4.10).
 *
 * A checagem não olha `Content-Type` nem corpo: `text/plain`, `multipart/form-data`
 * e `POST` vazio cruzam sites sem preflight, e são justamente o vetor.
 *
 * - `Origin` presente: precisa estar na allowlist.
 * - `Origin` ausente: vale o `Sec-Fetch-Site` do navegador, só `same-origin` ou
 *   `none`.
 * - Nenhum dos dois: recusa. Cliente servidor a servidor legítimo entra por rota
 *   própria com assinatura, não por exceção aqui.
 *
 * Vale em todo ambiente, desenvolvimento incluso: `CORS_ORIGINS` do `.env`
 * lista o frontend local.
 */
export default class OriginMiddleware {
  private static readonly SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS'])

  private static readonly TRUSTED_FETCH_SITES: ReadonlySet<string> = new Set([
    'same-origin',
    'none',
  ])

  async handle(context: HttpContext, next: NextFn) {
    if (OriginMiddleware.SAFE_METHODS.has(context.request.method())) return next()

    if (this.isAllowed(context.request)) return next()

    throw HTTPException.Forbidden(context.i18n.t('errors.origin_not_allowed'), 'ORIGIN_NOT_ALLOWED')
  }

  private isAllowed(request: HttpContext['request']): boolean {
    const origin = request.header('origin')

    if (origin) return corsOrigins.includes(origin)

    const site = request.header('sec-fetch-site') ?? ''

    return OriginMiddleware.TRUSTED_FETCH_SITES.has(site)
  }
}
