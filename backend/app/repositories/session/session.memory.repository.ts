import {
  SessionRepository,
  type RefreshGrant,
  type SessionTokens,
} from '#repositories/session/session.repository'

/**
 * The session tokens in memory, for the unit test. It honors the contract of
 * `SessionLucidRepository`: the issued token is read back, revocation removes
 * it, and the test reads what was issued and revoked.
 */
export class SessionMemoryRepository extends SessionRepository {
  readonly issued: string[] = []
  readonly revokedAll: string[] = []
  private readonly refresh = new Map<string, RefreshGrant>()
  private sequence = 0

  /** Test arrangement: a valid refresh token for the account. */
  withRefresh(value: string, grant: RefreshGrant): this {
    this.refresh.set(value, grant)
    return this
  }

  async issue(userId: string): Promise<SessionTokens | null> {
    this.issued.push(userId)
    this.sequence += 1
    const refreshToken = `refresh-${userId}-${this.sequence}`
    this.refresh.set(refreshToken, { userId, identifier: String(this.sequence) })

    return { accessToken: `access-${userId}-${this.sequence}`, refreshToken }
  }

  async revokeAll(userId: string): Promise<void> {
    this.revokedAll.push(userId)

    for (const [value, grant] of this.refresh) {
      if (grant.userId === userId) this.refresh.delete(value)
    }
  }

  async revoke(userId: string, identifier: string): Promise<boolean> {
    for (const [value, grant] of this.refresh) {
      if (grant.userId !== userId || grant.identifier !== identifier) continue

      this.refresh.delete(value)

      return true
    }

    return false
  }

  async readRefresh(value: string): Promise<RefreshGrant | null> {
    return this.refresh.get(value) ?? null
  }
}
