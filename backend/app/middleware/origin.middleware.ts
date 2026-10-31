import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import HTTPException from '#exceptions/http.exception'
import { corsOrigins } from '#config/cors'

/**
 * The CSRF barrier of the API, which authenticates by cookie.
 *
 * `SameSite=Lax` is not enough: a compromised sibling subdomain is *same-site* and
 * sends the cookie. So every method that is not `GET`/`HEAD`/`OPTIONS` checks
 * the origin against the same allowlist as CORS, **before the bodyparser**
 * (_standards/backend.md §4.10).
 *
 * The check looks at neither `Content-Type` nor body: `text/plain`, `multipart/form-data`
 * and an empty `POST` cross sites without preflight, and they are precisely the vector.
 *
 * - `Origin` present: must be in the allowlist.
 * - `Origin` absent: the browser's `Sec-Fetch-Site` applies, only `same-origin` or
 *   `none`.
 * - Neither: refuse. A legitimate server-to-server client enters through its own
 *   signed route, not through an exception here.
 *
 * Holds in every environment, development included: `CORS_ORIGINS` in `.env`
 * lists the local frontend.
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
