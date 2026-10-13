import { SORT_DIRECTION, type SortDirection } from '#core/entity'

/**
 * A ordem que a consulta vai usar: o que o payload pediu, ou o padrão do
 * recurso. Feito para ser espalhado - `query.orderBy(...sortOrder(payload,
 * 'createdAt'))`.
 *
 * O `fallback` é obrigatório porque é a ordem que a listagem já tinha antes de
 * aceitar o parâmetro: quem não manda `?sort` recebe exatamente a mesma
 * resposta de antes.
 *
 * A coluna não é conferida aqui - quem fecha a lista é o `sortFields()` do
 * validator, antes de o payload chegar ao use-case.
 *
 * Só serve a listagem cujo padrão é **crescente** - catálogo, cadastro, tudo
 * que se lê em ordem alfabética. Feed cronológico usa `recentFirst()`.
 */
export function sortOrder<TColumn extends string>(
  payload: { sort?: TColumn; direction?: SortDirection },
  fallback: TColumn,
): [TColumn, SortDirection] {
  return [payload.sort ?? fallback, payload.direction ?? SORT_DIRECTION.ASC]
}

/**
 * A ordem de uma listagem cronológica: `createdAt` **decrescente**, ao
 * contrário de todas as outras. Espalhado como o irmão -
 * `query.orderBy(...recentFirst(payload))`.
 *
 * Existe porque `sortOrder()` assume `asc`, e num feed o que interessa é o
 * último registro, não o primeiro.
 *
 * Função com nome próprio, e não um parâmetro de direção em `sortOrder()`: a
 * exceção fica visível na chamada, em vez de escondida atrás de um argumento
 * que ninguém lê ao passar os olhos pela consulta.
 */
export function recentFirst<TColumn extends string>(payload: {
  sort?: TColumn
  direction?: SortDirection
}): [TColumn | 'createdAt', SortDirection] {
  return [payload.sort ?? 'createdAt', payload.direction ?? SORT_DIRECTION.DESC]
}
