/** The plain token pair, as it comes out of issuance - the only moment it exists. */
export type SessionTokens = {
  readonly accessToken: string
  readonly refreshToken: string
}

/** What a valid refresh token says: whose it is and which row keeps it. */
export type RefreshGrant = {
  readonly userId: string
  readonly identifier: string
}

/**
 * The persistence of the session tokens, by intent (`_standards/domain.md`
 * §5.1): issue, read the refresh one and revoke. It is the single writer of
 * `auth_access_tokens`. Whoever writes the HTTP response is the controller, with `config/cookie.ts`; whoever
 * decides when to issue or revoke is the use case.
 *
 * `abstract class` and not `type`: it serves as a container token and as a type at the same
 * time. The concrete one is `SessionLucidRepository`, bound in `providers/repository.provider.ts`.
 */
export abstract class SessionRepository {
  /** The account's token pair; `null` when the provider did not return the plain value. */
  abstract issue(userId: string): Promise<SessionTokens | null>
  /**
   * Drops all the account's sessions, inside the transaction in progress when there is
   * one: the revocation must land together with the write that motivates it.
   */
  abstract revokeAll(userId: string): Promise<void>
  /** Deletes an account's token; `false` when it no longer existed. */
  abstract revoke(userId: string, identifier: string): Promise<boolean>
  /**
   * Reads a refresh token. `null` for the unreadable, the nonexistent, the expired and
   * the one that is not a refresh: to the caller they are the same thing.
   */
  abstract readRefresh(value: string): Promise<RefreshGrant | null>
}
