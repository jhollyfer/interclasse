import { inject } from '@adonisjs/core'
import { Secret } from '@adonisjs/core/helpers'
import logger from '@adonisjs/core/services/logger'

import User from '#models/user'
import { COOKIE_TOKEN } from '#config/cookie'
import {
  SessionRepository,
  type RefreshGrant,
  type SessionTokens,
} from '#repositories/session/session.repository'
import { TransactionContext } from '#core/transaction-context'

/** The `DbAccessTokensProvider` table, created by the `auth_access_tokens` migration. */
const SESSION_TABLE = 'auth_access_tokens'

/**
 * The session tokens in the database: issue, read the refresh one and revoke. Batch
 * revocation goes through the transaction in progress, which is why it lives in a
 * repository and not in an external I/O service.
 *
 * Separate from the controller, which writes the HTTP response: issuing a token touches the
 * database, writing a cookie touches the transport, and those are two reasons to change.
 */
@inject()
export class SessionLucidRepository extends SessionRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  /**
   * The token pair, issued for the account.
   *
   * `release()` only exists at creation: the token's plain value does not come back from the
   * database afterwards, which is why it goes up to the controller, who puts it in the
   * cookie.
   */
  async issue(userId: string): Promise<SessionTokens | null> {
    const tokenable = this.tokenable(userId)
    const accessToken = await User.accessTokens.create(tokenable, [], {
      name: COOKIE_TOKEN.ACCESS,
      expiresIn: COOKIE_TOKEN.ACCESS_EXPIRY,
    })

    const refreshToken = await User.accessTokens.create(tokenable, [], {
      name: COOKIE_TOKEN.REFRESH,
      expiresIn: COOKIE_TOKEN.REFRESH_EXPIRY,
    })

    // `value` is only optional in the type because the same `AccessToken` represents the
    // token read from the database, without the secret. Freshly created, it always comes.
    if (!accessToken.value || !refreshToken.value) return null

    return {
      accessToken: accessToken.value.release(),
      refreshToken: refreshToken.value.release(),
    }
  }

  /**
   * Drops all the account's sessions.
   *
   * By table, and not by `User.accessTokens.deleteAll`: the `@adonisjs/auth` provider
   * uses the model's connection and does not accept a transaction, and the
   * revocation must land together with the write that motivated it (password change,
   * role change, archiving) - two writes, one transaction (_standards/backend.md §4.2).
   */
  async revokeAll(userId: string): Promise<void> {
    await this.transaction.client().from(SESSION_TABLE).where('tokenable_id', userId).delete()
  }

  async revoke(userId: string, identifier: string): Promise<boolean> {
    const deleted = await User.accessTokens.delete(this.tokenable(userId), identifier)

    return deleted !== 0
  }

  async readRefresh(value: string): Promise<RefreshGrant | null> {
    // An unreadable token makes `verify` THROW instead of returning null.
    try {
      const token = await User.accessTokens.verify(new Secret(value))

      if (!token || token.name !== COOKIE_TOKEN.REFRESH) return null

      return { userId: String(token.tokenableId), identifier: String(token.identifier) }
    } catch (error) {
      logger.debug({ err: error }, '[session > readRefresh] unreadable token')

      return null
    }
  }

  /**
   * The token owner for the provider, which only reads its primary key. Building the
   * model with the id saves the query that issuing and revoking do not need.
   */
  private tokenable(userId: string): User {
    const tokenable = new User()
    tokenable.id = userId

    return tokenable
  }
}
