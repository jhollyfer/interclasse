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

/** A tabela do `DbAccessTokensProvider`, criada pela migration de `auth_access_tokens`. */
const SESSION_TABLE = 'auth_access_tokens'

/**
 * Os tokens da sessão no banco: emitir, ler o de refresh e revogar. A
 * revogação em lote passa pela transação em curso, e é por isso que mora num
 * repository e não num service de I/O externo.
 *
 * Separado do controller, que escreve a resposta HTTP: emitir token toca o
 * banco, escrever cookie toca o transporte, e são duas razões para mudar.
 */
@inject()
export class SessionLucidRepository extends SessionRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  /**
   * O par de tokens, emitido para a conta.
   *
   * `release()` só existe na criação: o valor em claro do token não volta do
   * banco depois, e é por isso que ele sobe até o controller, que o põe no
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

    // `value` só é opcional no tipo porque o mesmo `AccessToken` representa o
    // token lido do banco, sem o segredo. Recém-criado, ele sempre vem.
    if (!accessToken.value || !refreshToken.value) return null

    return {
      accessToken: accessToken.value.release(),
      refreshToken: refreshToken.value.release(),
    }
  }

  /**
   * Derruba todas as sessões da conta.
   *
   * Pela tabela, e não por `User.accessTokens.deleteAll`: o provider do
   * `@adonisjs/auth` usa a conexão do model e não aceita transação, e a
   * revogação precisa cair junto com a escrita que a motivou (troca de senha,
   * de papel, arquivamento) - duas escritas, uma transação (_standards/backend.md §4.2).
   */
  async revokeAll(userId: string): Promise<void> {
    await this.transaction.client().from(SESSION_TABLE).where('tokenable_id', userId).delete()
  }

  async revoke(userId: string, identifier: string): Promise<boolean> {
    const deleted = await User.accessTokens.delete(this.tokenable(userId), identifier)

    return deleted !== 0
  }

  async readRefresh(value: string): Promise<RefreshGrant | null> {
    // Um token ilegível faz o `verify` LANÇAR em vez de devolver null.
    try {
      const token = await User.accessTokens.verify(new Secret(value))

      if (!token || token.name !== COOKIE_TOKEN.REFRESH) return null

      return { userId: String(token.tokenableId), identifier: String(token.identifier) }
    } catch (error) {
      logger.debug({ err: error }, '[session > readRefresh] token ilegível')

      return null
    }
  }

  /**
   * O dono do token para o provider, que só lê a chave primária dele. Montar o
   * model com o id poupa a consulta que a emissão e a revogação não precisam.
   */
  private tokenable(userId: string): User {
    const tokenable = new User()
    tokenable.id = userId

    return tokenable
  }
}
