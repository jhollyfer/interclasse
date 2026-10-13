import type User from '#models/user'
import { BasePolicy, AuthorizationResponse } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

/**
 * Quem pode operar qual conta no painel.
 *
 * É a metade que o `role.middleware` não consegue expressar. Ele olha só o papel
 * de **quem chama**, e a regra aqui depende de **quem é o alvo**: um
 * administrador opera contas, mas não a própria por este recurso.
 *
 * `BasePolicy` do Bouncer, checada pelo controller com `ctx.bouncer`
 * (_padroes/backend.md §4.6). A negação vira `AuthorizationException`, que o
 * `handler.ts` traduz para o envelope de erro; o identificador de tradução da
 * resposta é o `code` estável do envelope.
 *
 * Recebe o id do alvo, e não o registro: a guarda vale antes de qualquer
 * leitura (`403` antes de `404`), dizendo que é proibido em vez de esconder a
 * existência da própria conta.
 *
 * **Sem regra de dono**: aqui os papéis são `ADMINISTRATOR`, `ADVISOR` e
 * `REPRESENTATIVE`, e não há `OWNER` a proteger.
 */
export default class UserPolicy extends BasePolicy {
  /**
   * Papel e status da própria conta não se trocam por aqui: sem a guarda um
   * administrador se rebaixa ou se marca `INACTIVE` e perde o painel. Nome e
   * e-mail continuam editáveis, porque nenhum dos dois tranca ninguém para fora.
   *
   * A presença do campo basta, sem comparar com o valor atual: mandar o próprio
   * papel de volta não é edição.
   */
  update(
    actor: User,
    targetId: string,
    changes: { readonly role?: unknown; readonly status?: unknown }
  ): AuthorizerResponse {
    if (actor.id !== targetId) return true
    if (changes.role === undefined && changes.status === undefined) return true

    return AuthorizationResponse.deny('Você não pode alterar o próprio papel ou status', 403).t(
      'SELF_ACCESS_FORBIDDEN'
    )
  }

  archive(actor: User, targetId: string): AuthorizerResponse {
    if (actor.id !== targetId) return true

    return AuthorizationResponse.deny('Você não pode arquivar a própria conta', 403).t(
      'SELF_ARCHIVE_FORBIDDEN'
    )
  }

  delete(actor: User, targetId: string): AuthorizerResponse {
    if (actor.id !== targetId) return true

    return AuthorizationResponse.deny('Você não pode apagar a própria conta', 403).t(
      'SELF_DELETE_FORBIDDEN'
    )
  }
}
