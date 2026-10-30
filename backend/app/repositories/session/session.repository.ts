/** O par de tokens em claro, como sai da emissão - o único momento em que existe. */
export type SessionTokens = {
  readonly accessToken: string
  readonly refreshToken: string
}

/** O que um token de refresh válido diz: de quem é e qual linha o guarda. */
export type RefreshGrant = {
  readonly userId: string
  readonly identifier: string
}

/**
 * A persistência dos tokens da sessão, por intenção (`_standards/domain.md`
 * §5.1): emitir, ler o de refresh e revogar. É o escritor único de
 * `auth_access_tokens`. Quem escreve a resposta HTTP é o `CookieService`; quem
 * decide quando emitir ou revogar é o use-case.
 *
 * `abstract class` e não `type`: serve de token no container e de tipo ao mesmo
 * tempo. O concreto é `SessionLucidRepository`, ligado em `providers/repository.provider.ts`.
 */
export abstract class SessionRepository {
  /** O par de tokens da conta; `null` quando o provider não devolveu o valor em claro. */
  abstract issue(userId: string): Promise<SessionTokens | null>
  /**
   * Derruba todas as sessões da conta, dentro da transação em curso quando há
   * uma: a revogação precisa cair junto com a escrita que a motiva.
   */
  abstract revokeAll(userId: string): Promise<void>
  /** Apaga um token da conta; `false` quando ele já não existia. */
  abstract revoke(userId: string, identifier: string): Promise<boolean>
  /**
   * Lê um token de refresh. `null` para o ilegível, o inexistente, o vencido e
   * o que não é de refresh: para quem chama são a mesma coisa.
   */
  abstract readRefresh(value: string): Promise<RefreshGrant | null>
}
