import {
  SessionContract,
  type RefreshGrant,
  type SessionTokens,
} from '#services/session/session.contract'

/**
 * Os tokens da sessão em memória, para o teste unitário. Honra o contrato do
 * `SessionService`: o token de refresh é de uso único, e o teste lê o que foi
 * emitido e revogado.
 */
export class SessionFake extends SessionContract {
  readonly issued: string[] = []
  readonly revokedAll: string[] = []
  private readonly refresh = new Map<string, RefreshGrant>()
  private readonly live = new Set<string>()

  /** Arranjo do teste: um token de refresh válido para a conta. */
  withRefresh(value: string, grant: RefreshGrant): this {
    this.refresh.set(value, grant)
    this.live.add(`${grant.userId}:${grant.identifier}`)
    return this
  }

  async issue(userId: string): Promise<SessionTokens> {
    this.issued.push(userId)

    return { accessToken: `access-${userId}`, refreshToken: `refresh-${userId}` }
  }

  async revokeAll(userId: string): Promise<void> {
    this.revokedAll.push(userId)
  }

  async revoke(userId: string, identifier: string): Promise<boolean> {
    return this.live.delete(`${userId}:${identifier}`)
  }

  async readRefresh(value: string): Promise<RefreshGrant | null> {
    return this.refresh.get(value) ?? null
  }
}
