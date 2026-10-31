/** The result of a bulk action: how many passed and how many did not. */
export type BulkOutcome = {
  done: number
  failed: number
}

/**
 * Runs an action over several items and counts what passed.
 *
 * **A loop over the by-id endpoints, and not a bulk endpoint.** The API has
 * no `bulk-archive` or `bulk-delete`, and inventing one just for the selection bar
 * would be writing a new contract for a button. The cost is N requests, with N
 * bounded by `perPage` - at most 100.
 *
 * `allSettled` and not `all`: with `all` the first failure aborts the rest, and the
 * person would be left with half archived without knowing which half. Here all of them
 * finish and the count is exact.
 */
export async function runBulk<TItem>(
  items: ReadonlyArray<TItem>,
  action: (item: TItem) => Promise<unknown>,
): Promise<BulkOutcome> {
  const results = await Promise.allSettled(items.map((item) => action(item)))

  const done = results.filter((result) => result.status === 'fulfilled').length

  return { done, failed: results.length - done }
}
