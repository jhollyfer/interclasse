import app from '@adonisjs/core/services/app'

import env from '#start/env'

/**
 * The names and lifetimes of the session, in one place.
 *
 * Each token's `name` is not decoration: it is what the guard checks to refuse
 * a refresh token presented as an access token. Both come out of the same
 * `DbAccessTokensProvider` and are indistinguishable without it.
 */
export const COOKIE_TOKEN = {
  DRIVER_NAME: 'cookie-access-tokens',
  ACCESS: 'access-token',
  REFRESH: 'refresh-token',
  ACCESS_EXPIRY: '1d',
  REFRESH_EXPIRY: '7d',
} as const

/**
 * The attributes that identify the session cookie, without the lifetime.
 *
 * They apply to issuing and to clearing: clearing means matching `name` + `domain` + `path`, and
 * getting one of the three wrong clears nothing, the lifetime does not count.
 *
 * `sameSite` is `lax` and stays `lax` (_standards/backend.md §4.10). `none` sends the
 * cookie on every request from another site and only enters by a recorded decision,
 * when app and API are on different sites; missing configuration never
 * chooses it. `domain` only exists with `COOKIE_DOMAIN`: without it the cookie is born
 * host-only and the frontend SSR, on another host, does not receive it. The key does not exist
 * when there is no value, because an explicit `domain: undefined` reaches some
 * proxies as the string "undefined" in `Set-Cookie`
 * (_doc-lib/adonisjs.md#guides/basics/cookies,
 * https://docs.adonisjs.com/guides/basics/cookies).
 */
type CookieAttributes = {
  readonly httpOnly: true
  readonly secure: boolean
  readonly sameSite: 'lax'
  readonly path: '/'
  readonly domain?: string
}

const domain = env.get('COOKIE_DOMAIN')

const base: CookieAttributes = {
  httpOnly: true,
  secure: app.inProduction,
  sameSite: 'lax',
  path: '/',
}

let attributes: CookieAttributes = base

if (domain) attributes = { ...base, domain }

export const cookieOptions = {
  access: { ...attributes, maxAge: COOKIE_TOKEN.ACCESS_EXPIRY },
  refresh: { ...attributes, maxAge: COOKIE_TOKEN.REFRESH_EXPIRY },
  clear: attributes,
} as const
