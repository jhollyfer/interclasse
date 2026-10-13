import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'

import env from '#start/env'
import User from '#models/user'

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

/** O hostname de uma URL, ou `null` quando o valor não é uma URL. */
function hostnameOf(url: string | undefined): string | null {
  if (!url) return null

  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** Tudo depois do primeiro rótulo; `''` quando não há o que tirar. */
function parentDomain(hostname: string): string {
  const labels = hostname.split('.')

  if (labels.length < 3) return ''

  return labels.slice(1).join('.')
}

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
export function resolveSameSite(
  clientUrl: string | undefined,
  serverUrl: string | undefined,
): 'lax' | 'none' {
  const client = hostnameOf(clientUrl)
  const server = hostnameOf(serverUrl)

  if (!client || !server) return 'none'
  if (client === server) return 'lax'

  const parent = parentDomain(client)

  if (parent && parent === parentDomain(server)) return 'lax'

  return 'none'
}

/**
 * A primeira origem de `CORS_ORIGIN`, que é o endereço do cliente.
 *
 * Primeira e não a lista inteira porque `resolveSameSite` responde por par, e o
 * atributo do cookie é um só. Quem serve mais de um front em sites diferentes
 * está no caso em que `none` é obrigatório de qualquer jeito.
 */
function clientOrigin(): string | undefined {
  const [first] = (env.get('CORS_ORIGIN') ?? '').split(',')

  return first?.trim() || undefined
}

export default class CookieService {
  /**
   * Os atributos que identificam o cookie, sem o prazo.
   *
   * Separados do `maxAge` porque apagar um cookie é casar `name` + `domain` +
   * `path`: errar um dos três não apaga nada, e o prazo não entra na conta.
   */
  private attributes() {
    let sameSite: 'lax' | 'none' = 'lax' as const

    if (app.inProduction) sameSite = resolveSameSite(clientOrigin(), env.get('APP_SERVER_URL'))

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

  set(context: HttpContext, tokens: { accessToken: string; refreshToken: string }) {
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

/**
 * O par de tokens da sessão, emitido para o usuário.
 *
 * Função e não método de `CookieService`: emitir token toca o banco, escrever
 * cookie toca a resposta HTTP, e são duas razões diferentes para este arquivo
 * mudar. Ficam no mesmo módulo porque o `COOKIE_TOKEN` acima é quem nomeia e
 * data os dois tokens, e porque quem chama um chama o outro em seguida.
 *
 * `release()` só existe na criação: o valor em claro do token não volta do
 * banco depois, e é por isso que ele sobe até o controller em vez de o cookie
 * ser escrito aqui dentro.
 */
export async function issueSessionTokens(user: User) {
  const accessToken = await User.accessTokens.create(user, [], {
    name: COOKIE_TOKEN.ACCESS,
    expiresIn: COOKIE_TOKEN.ACCESS_EXPIRY,
  })

  const refreshToken = await User.accessTokens.create(user, [], {
    name: COOKIE_TOKEN.REFRESH,
    expiresIn: COOKIE_TOKEN.REFRESH_EXPIRY,
  })

  // `value` só é opcional no tipo porque o mesmo `AccessToken` representa o
  // token lido do banco, sem o segredo. Recém-criado, ele sempre vem.
  if (!accessToken.value || !refreshToken.value) {
    throw new Error('token de sessão criado sem o valor em claro')
  }

  return {
    accessToken: accessToken.value.release(),
    refreshToken: refreshToken.value.release(),
  }
}
