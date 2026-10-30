/**
 * O sentido da ordenação de uma listagem. Ausente é `asc`, que é a ordem que
 * as listagens já tinham antes de aceitarem o parâmetro.
 */
export const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export type SortDirection = (typeof SORT_DIRECTION)[keyof typeof SORT_DIRECTION]

export const SORT_DIRECTIONS = Object.values(SORT_DIRECTION)
