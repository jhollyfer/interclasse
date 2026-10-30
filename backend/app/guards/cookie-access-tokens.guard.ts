import app from '@adonisjs/core/services/app'
import { Secret } from '@adonisjs/core/helpers'
import { errors, symbols } from '@adonisjs/auth'
import type { HttpContext } from '@adonisjs/core/http'
import type { AccessToken } from '@adonisjs/auth/access_tokens'
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'
import { ACTIVE_STATUS } from '@interclasse/shared'

import User from '#models/user'
import { COOKIE_TOKEN } from '#services/cookie/cookie.service'
import { SessionRepository } from '#repositories/session/session.repository'

/**
 * O usuário já autenticado, onde `currentAccessToken` deixou de ser opcional.
 *
 * Interseção, e não `Merge`: `User` é uma classe do Lucid, e mapear as chaves
 * dela achataria os métodos e o tipo nominal que `GuardContract` espera.
 */
type GuardUser = User & { currentAccessToken: AccessToken }

/**
 * Reaproveita a maquinaria nativa de access tokens opacos do Adonis - hash,
 * expiração e persistência pelo `DbAccessTokensProvider` - e troca só o
 * transporte: o token é lido do cookie `access-token`.
 *
 * **Sem fallback para o cabeçalho `Authorization`.** O cookie é `httpOnly`
 * justamente para o JavaScript da página não alcançar o token; aceitar
 * o mesmo token pelo cabeçalho reabriria o caminho que o `httpOnly` fecha.
 */
export class CookieAccessTokensGuard implements GuardContract<GuardUser> {
  readonly driverName = COOKIE_TOKEN.DRIVER_NAME
  authenticationAttempted = false
  isAuthenticated = false
  user?: GuardUser;

  declare [symbols.GUARD_KNOWN_EVENTS]: {}

  constructor(private context: HttpContext) {}

  #authenticationFailed() {
    return new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
      guardDriverName: this.driverName,
    })
  }

  #getCookieToken(): string {
    const token = this.context.request.cookie(COOKIE_TOKEN.ACCESS)

    if (!token) throw this.#authenticationFailed()

    return token
  }

  getUserOrFail(): GuardUser {
    if (!this.user) throw this.#authenticationFailed()

    return this.user
  }

  async authenticate(): Promise<GuardUser> {
    if (this.authenticationAttempted) return this.getUserOrFail()

    this.authenticationAttempted = true

    const secret = new Secret(this.#getCookieToken())

    const accessToken = await User.accessTokens.verify(secret)

    // O token de refresh sai do mesmo provedor e é válido pela mesma
    // verificação: sem conferir o `name`, apresentá-lo como token de acesso
    // daria uma sessão com a validade do refresh.
    if (!accessToken || accessToken.name !== COOKIE_TOKEN.ACCESS) throw this.#authenticationFailed()

    // O filtro estava só no sign-in, e o token vive um dia: arquivar ou
    // desativar alguém não o expulsava, apenas o impedia de entrar de novo.
    // Revogar acesso precisa ter efeito na requisição seguinte.
    const user = await User.query()
      // `tokenableId` é tipado como `string | number | BigInt` pelo pacote de
      // auth, e o query builder não aceita `BigInt`. Aqui a chave é sempre uuid.
      .where('id', String(accessToken.tokenableId))
      .withScopes((scopes) => scopes.notDeleted())
      .where('status', ACTIVE_STATUS.ACTIVE)
      .first()

    if (!user) throw this.#authenticationFailed()

    // `Object.assign` em vez de `as GuardUser`: ele devolve
    // `User & { currentAccessToken: AccessToken }` porque o campo foi de fato
    // atribuído, e não porque alguém afirmou ao compilador que estava lá.
    this.user = Object.assign(user, { currentAccessToken: accessToken })
    this.isAuthenticated = true
    return this.user
  }

  async check(): Promise<boolean> {
    try {
      await this.authenticate()
      return true
    } catch {
      return false
    }
  }

  /**
   * Como o api client do Japa autentica um usuário nos testes. Sem isto,
   * `client.get(...).loginAs(user)` não teria como montar a sessão, e cada
   * spec teria de fazer o sign-in por HTTP antes de cada requisição.
   */
  async authenticateAsClient(user: User): Promise<AuthClientResponse> {
    // O guard nasce fora do container (factory de `config/auth.ts`); o service
    // é pedido a ele, nunca construído com `new`.
    const session = await app.container.make(SessionRepository)
    const tokens = await session.issue(user.id)
    // Sem o valor em claro não há sessão a montar: o cliente segue sem cookie e a rota responde 401.
    if (!tokens) return { cookies: {} }

    return {
      cookies: {
        [COOKIE_TOKEN.ACCESS]: tokens.accessToken,
        [COOKIE_TOKEN.REFRESH]: tokens.refreshToken,
      },
    }
  }
}

export function cookieAccessTokensGuard() {
  return (context: HttpContext) => new CookieAccessTokensGuard(context)
}
