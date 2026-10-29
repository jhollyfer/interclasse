import { withExtra } from '#/lib/list-search'

/**
 * `?role=` e `?status=` recortam a listagem, como o
 * `UserPaginateValidator` aceita: um separa quem administra de
 * quem edita, o outro separa quem entra de quem foi desativado sem ser
 * arquivado.
 *
 * `as const` não é enfeite: sem ele `TKey` infere `string`, o retorno vira um
 * índice aberto e a união de search do roteador deixa de fechar - os
 * componentes genéricos da tabela voltam a não compilar.
 */
export const validateSearch = withExtra(['role', 'status'] as const)
