import app from '@adonisjs/core/services/app'
import { Secret } from '@adonisjs/core/helpers'
import { errors, symbols } from '@adonisjs/auth'
import type { HttpContext } from '@adonisjs/core/http'
import type { AccessToken } from '@adonisjs/auth/access_tokens'
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'
import { ACTIVE_STATUS } from '@interclasse/shared'

import User from '#models/user'
import { COOKIE_TOKEN } from '#config/cookie'
import { SessionRepository } from '#repositories/session/session.repository'

/**
 * The already authenticated user, where `currentAccessToken` is no longer optional.
 *
 * An intersection, not `Merge`: `User` is a Lucid class, and mapping its
 * keys would flatten the methods and the nominal type `GuardContract` expects.
 */
type GuardUser = User & { currentAccessToken: AccessToken }

/**
 * Reuses Adonis' native machinery of opaque access tokens - hash,
 * expiry and persistence by the `DbAccessTokensProvider` - and swaps only the
 * transport: the token is read from the `access-token` cookie.
 *
 * **No fallback to the `Authorization` header.** The cookie is `httpOnly`
 * precisely so the page JavaScript cannot reach the token; accepting
 * the same token by header would reopen the path `httpOnly` closes.
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

    // The refresh token comes out of the same provider and is valid by the same
    // verification: without checking the `name`, presenting it as an access token
    // would give a session with the refresh's lifetime.
    if (!accessToken || accessToken.name !== COOKIE_TOKEN.ACCESS) throw this.#authenticationFailed()

    // The filter was only on sign-in, and the token lives a day: archiving or
    // deactivating someone did not kick them out, only stopped them from signing in again.
    // Revoking access must take effect on the next request.
    const user = await User.query()
      // `tokenableId` is typed `string | number | BigInt` by the auth
      // package, and the query builder does not accept `BigInt`. Here the key is always a uuid.
      .where('id', String(accessToken.tokenableId))
      .withScopes((scopes) => scopes.notDeleted())
      .where('status', ACTIVE_STATUS.ACTIVE)
      .first()

    if (!user) throw this.#authenticationFailed()

    // `Object.assign` instead of `as GuardUser`: it returns
    // `User & { currentAccessToken: AccessToken }` because the field was actually
    // assigned, and not because someone asserted to the compiler that it was there.
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
   * How Japa's api client authenticates a user in tests. Without this,
   * `client.get(...).loginAs(user)` would have no way to build the session, and each
   * spec would have to sign in over HTTP before every request.
   */
  async authenticateAsClient(user: User): Promise<AuthClientResponse> {
    // The guard is born outside the container (`config/auth.ts` factory); the service
    // is requested from it, never built with `new`.
    const session = await app.container.make(SessionRepository)
    const tokens = await session.issue(user.id)
    // Without the plain value there is no session to build: the client stays without a cookie and the route answers 401.
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
