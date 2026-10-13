import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import User from '#models/user'
import { COOKIE_TOKEN } from '#services/cookie/cookie.service'

/** A tabela do `DbAccessTokensProvider`, criada pela migration de `auth_access_tokens`. */
const SESSION_TABLE = 'auth_access_tokens'

/** O par de tokens em claro, como sai da emissão - o único momento em que existe. */
export type SessionTokens = {
  readonly accessToken: string
  readonly refreshToken: string
}

/**
 * Os tokens da sessão no banco: emitir e revogar.
 *
 * Separado do `CookieService`, que escreve a resposta HTTP: emitir token toca o
 * banco, escrever cookie toca o transporte, e são duas razões para mudar.
 */
export default class SessionService {
  /**
   * O par de tokens, emitido para o usuário.
   *
   * `release()` só existe na criação: o valor em claro do token não volta do
   * banco depois, e é por isso que ele sobe até o controller, que o põe no
   * cookie.
   */
  async issue(user: User): Promise<SessionTokens> {
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

  /**
   * Derruba todas as sessões da conta.
   *
   * Pela tabela, e não por `User.accessTokens.deleteAll`: o provider do
   * `@adonisjs/auth` usa a conexão do model e não aceita transação, e a
   * revogação precisa cair junto com a escrita que a motivou (troca de senha,
   * de papel, arquivamento) - duas escritas, uma transação (_padroes/backend.md §4.2).
   */
  async revokeAll(user: User, client?: TransactionClientContract): Promise<void> {
    const query = client ?? db
    await query.from(SESSION_TABLE).where('tokenable_id', user.id).delete()
  }
}
