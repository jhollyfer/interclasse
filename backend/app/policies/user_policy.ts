import type User from '#models/user'

/**
 * Quem pode operar qual conta no painel.
 *
 * É a metade que o `role_middleware` não consegue expressar. Ele olha só o papel
 * de **quem chama**, e a regra aqui depende de **quem é o alvo**: um
 * administrador opera contas, mas não a própria por este recurso.
 *
 * Regra por registro mora aqui, uma vez, e não num `if` repetido em cada caso de
 * uso — que era como estava, e por isso o texto do erro divergia entre `update`,
 * `archive` e `delete` sem que nada apontasse.
 *
 * Classe simples e não `BasePolicy` do Bouncer: o pacote traria `ctx.bouncer`,
 * que obriga o caso de uso a receber `HttpContext` e quebra o contrato
 * `Payload -> Either`. O que se queria dele era ter a regra fora do caso de uso,
 * testável e reusável — e isso uma classe injetável já dá, sem dependência nova.
 *
 * **Sem regra de dono**, ao contrário dos projetos irmãos: aqui os papéis são
 * `ADMINISTRATOR`, `ADVISOR` e `REPRESENTATIVE`, e não há `OWNER` a proteger. Copiar a regra de lá
 * traria uma comparação que nunca é verdadeira.
 */
export default class UserPolicy {
  /**
   * A própria conta não se opera por aqui.
   *
   * Não é para proteger o dado, é para fechar a auto-promoção e o
   * auto-arquivamento: o validator recusa valores fora da lista, mas não sabe
   * **quem** está chamando. O perfil próprio se edita em `/account`, que é outro
   * caminho e não aceita `role` nem `status`.
   */
  operate(actor: User, targetId: string): boolean {
    return actor.id !== targetId
  }
}
