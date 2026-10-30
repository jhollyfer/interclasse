import app from '@adonisjs/core/services/app'

import env from '#start/env'

/**
 * Os nomes e as validades da sessão, num lugar só.
 *
 * O `name` de cada token não é decoração: é o que o guard confere para recusar
 * um token de refresh apresentado como token de acesso. Os dois saem do mesmo
 * `DbAccessTokensProvider` e são indistinguíveis sem ele.
 */
export const COOKIE_TOKEN = {
  DRIVER_NAME: 'cookie-access-tokens',
  ACCESS: 'access-token',
  REFRESH: 'refresh-token',
  ACCESS_EXPIRY: '1d',
  REFRESH_EXPIRY: '7d',
} as const

/**
 * Os atributos que identificam o cookie de sessão, sem o prazo.
 *
 * Valem para emitir e para apagar: apagar é casar `name` + `domain` + `path`, e
 * errar um dos três não apaga nada, o prazo não entra na conta.
 *
 * `sameSite` é `lax` e fica `lax` (_standards/backend.md §4.10). `none` manda o
 * cookie em toda requisição de outro site e só entra por decisão registrada,
 * quando app e API estiverem em sites diferentes; configuração faltando nunca o
 * escolhe. `domain` só existe com `COOKIE_DOMAIN`: sem ele o cookie nasce
 * host-only e o SSR do frontend, em outro host, não o recebe. A chave não existe
 * quando não há valor, porque um `domain: undefined` explícito chega a alguns
 * proxies como a string "undefined" no `Set-Cookie`
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
