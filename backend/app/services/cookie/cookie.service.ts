import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'

import { corsOrigins } from '#config/cors'
import type { SessionTokens } from '#services/session/session.service'
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

export default class CookieService {
  /**
   * `lax` quando o app e a API ficam no mesmo site; `none` só quando não ficam.
   *
   * `SameSite=None` manda o cookie de sessão em **toda** requisição cross-site, e
   * a única barreira de CSRF que resta é a checagem de `Origin` - que não alcança
   * os content-types simples. Havia razão para o `none` fixo em produção: ele
   * sustenta deploy com API e app em sites diferentes. Onde os dois estão sob o
   * mesmo domínio-pai, ele é `none` sem precisar.
   *
   * "Mesmo site" aqui é "mesmo domínio-pai": tudo depois do primeiro rótulo. Não é
   * a lista de sufixos públicos - `api.x.com.br` e `app.y.com.br` cairiam como
   * iguais. O erro dessa aproximação é sempre para o lado apertado (`lax` onde
   * `none` era preciso), e aí a sessão simplesmente não sobe: falha barulhenta,
   * não brecha silenciosa. Quem estiver nesse desenho configura `COOKIE_DOMAIN`.
   */
  sameSite(clientUrl: string | undefined, serverUrl: string | undefined): 'lax' | 'none' {
    const client = this.hostnameOf(clientUrl)
    const server = this.hostnameOf(serverUrl)

    if (!client || !server) return 'none'
    if (client === server) return 'lax'

    const parent = this.parentDomain(client)

    if (parent && parent === this.parentDomain(server)) return 'lax'

    return 'none'
  }

  /** O hostname de uma URL, ou `null` quando o valor não é uma URL. */
  private hostnameOf(url: string | undefined): string | null {
    if (!url) return null

    try {
      return new URL(url).hostname.toLowerCase()
    } catch {
      return null
    }
  }

  /** Tudo depois do primeiro rótulo; `''` quando não há o que tirar. */
  private parentDomain(hostname: string): string {
    const labels = hostname.split('.')

    if (labels.length < 3) return ''

    return labels.slice(1).join('.')
  }

  /**
   * Os atributos que identificam o cookie, sem o prazo.
   *
   * Separados do `maxAge` porque apagar um cookie é casar `name` + `domain` +
   * `path`: errar um dos três não apaga nada, e o prazo não entra na conta.
   */
  private attributes() {
    let sameSite: 'lax' | 'none' = 'lax' as const

    // A primeira origem da allowlist é o endereço do cliente: o atributo do
    // cookie é um só, e quem serve fronts em sites diferentes já cai em `none`.
    if (app.inProduction) sameSite = this.sameSite(corsOrigins[0], env.get('APP_SERVER_URL'))

    const domain = env.get('COOKIE_DOMAIN')

    const options = {
      httpOnly: true,
      secure: app.inProduction,
      sameSite,
      path: '/',
    }

    // A chave `domain` não existe quando não há valor. Um `domain: undefined`
    // explícito chega a alguns proxies como a string "undefined" no
    // `Set-Cookie`, e aí o navegador descarta o cookie. Ausente, o cookie é
    // host-only e some no SSR do frontend, que roda em outro host.
    if (!domain) return options

    return { ...options, domain }
  }

  private get(maxAge: string) {
    return { ...this.attributes(), maxAge }
  }

  set(context: HttpContext, tokens: SessionTokens) {
    context.response
      .cookie(COOKIE_TOKEN.ACCESS, tokens.accessToken, this.get(COOKIE_TOKEN.ACCESS_EXPIRY))
      .cookie(COOKIE_TOKEN.REFRESH, tokens.refreshToken, this.get(COOKIE_TOKEN.REFRESH_EXPIRY))
  }

  clear(context: HttpContext) {
    // Os MESMOS atributos da emissão, e não `clearCookie` pelado: sem eles o
    // navegador cria um segundo cookie host-only vazio e o de domínio sobrevive
    // - o logout "funciona" na resposta e a sessão segue de pé no F5 seguinte.
    const options = this.attributes()

    context.response
      .clearCookie(COOKIE_TOKEN.ACCESS, options)
      .clearCookie(COOKIE_TOKEN.REFRESH, options)
  }
}
