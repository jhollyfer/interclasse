import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import { BasePolicy, AuthorizationResponse } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import type { Actor } from '@interclasse/shared'

import type { User } from '#domain/user/user.entity'

/**
 * Quem pode operar qual conta no painel.
 *
 * É a metade que o `role.middleware` não consegue expressar. Ele olha só o papel
 * de **quem chama**, e a regra aqui depende de **quem é o alvo**: um
 * administrador opera contas, mas não a própria por este recurso.
 *
 * `BasePolicy` do Bouncer, checada pelo controller com `ctx.bouncer`
 * (_standards/backend.md §4.6, _doc-lib/adonisjs.md#guides/auth/authorization).
 * Recebe `(actor, conta | null)`: conta inexistente nega com `404`, o mesmo
 * `USER_NOT_FOUND` do use-case. A negação vira `AuthorizationException`, que o
 * `handler.ts` traduz para o envelope; o identificador de tradução é o `code`.
 * A mensagem sai pelo `I18n` da requisição.
 *
 * **Sem regra de dono**: aqui os papéis são `ADMINISTRATOR`, `ADVISOR` e
 * `REPRESENTATIVE`, e não há `OWNER` a proteger.
 */
@inject()
export default class UserPolicy extends BasePolicy {
  constructor(private readonly i18n: I18n) {
    super()
  }

  /**
   * Papel e status da própria conta não se trocam por aqui: sem a guarda um
   * administrador se rebaixa ou se marca `INACTIVE` e perde o painel. Nome e
   * e-mail continuam editáveis, porque nenhum dos dois tranca ninguém para fora.
   *
   * A presença do campo basta, sem comparar com o valor atual: mandar o próprio
   * papel de volta não é edição.
   */
  update(
    actor: Actor,
    target: User | null,
    changes: { readonly role?: unknown; readonly status?: unknown },
  ): AuthorizerResponse {
    if (!target) return this.notFound()
    if (actor.id !== target.id) return true
    if (changes.role === undefined && changes.status === undefined) return true

    return AuthorizationResponse.deny(this.i18n.t('users.self_access_forbidden'), 403).t(
      'SELF_ACCESS_FORBIDDEN',
    )
  }

  archive(actor: Actor, target: User | null): AuthorizerResponse {
    if (!target) return this.notFound()
    if (actor.id !== target.id) return true

    return AuthorizationResponse.deny(this.i18n.t('users.self_archive_forbidden'), 403).t(
      'SELF_ARCHIVE_FORBIDDEN',
    )
  }

  delete(actor: Actor, target: User | null): AuthorizerResponse {
    if (!target) return this.notFound()
    if (actor.id !== target.id) return true

    return AuthorizationResponse.deny(this.i18n.t('users.self_delete_forbidden'), 403).t(
      'SELF_DELETE_FORBIDDEN',
    )
  }

  private notFound(): AuthorizerResponse {
    return AuthorizationResponse.deny(this.i18n.t('users.not_found'), 404).t('USER_NOT_FOUND')
  }
}
