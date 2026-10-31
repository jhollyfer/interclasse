import { SORT_DIRECTION, type SortDirection } from '@interclasse/shared'

/**
 * The order the query will use: what the payload asked for, or the resource's
 * default. Made to be spread - `query.orderBy(...sortOrder(payload,
 * 'createdAt'))`.
 *
 * The `fallback` is required because it is the order the listing already had before
 * accepting the parameter: whoever does not send `?sort` gets exactly the same
 * response as before.
 *
 * The column is not checked here - the validator's `sortFields()` closes
 * the list, before the payload reaches the use case.
 *
 * Only for listings whose default is **ascending** - catalogs, registries, anything
 * read in alphabetical order. A chronological feed uses `recentFirst()`.
 */
export function sortOrder<TColumn extends string>(
  payload: { sort?: TColumn; direction?: SortDirection },
  fallback: TColumn,
): [TColumn, SortDirection] {
  return [payload.sort ?? fallback, payload.direction ?? SORT_DIRECTION.ASC]
}

/**
 * The order of a chronological listing: `createdAt` **descending**, unlike
 * all the others. Spread like its sibling -
 * `query.orderBy(...recentFirst(payload))`.
 *
 * It exists because `sortOrder()` assumes `asc`, and in a feed what matters is the
 * latest record, not the first.
 *
 * A function with its own name, and not a direction parameter on `sortOrder()`: the
 * exception stays visible at the call site, instead of hidden behind an argument
 * nobody reads when skimming the query.
 */
export function recentFirst<TColumn extends string>(payload: {
  sort?: TColumn
  direction?: SortDirection
}): [TColumn | 'createdAt', SortDirection] {
  return [payload.sort ?? 'createdAt', payload.direction ?? SORT_DIRECTION.DESC]
}
