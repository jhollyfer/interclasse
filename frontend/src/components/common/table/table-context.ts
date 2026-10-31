import * as React from 'react'

import type { ListSearch } from '#/lib/list-search'

/**
 * What the whole listing shares - and nothing else.
 *
 * **The table instance is not here on purpose.** A `React.Context` does not
 * carry the generic of whoever provides it, and TanStack's instance takes `TRow`
 * in parameter position in `options`, `getRowId`, `Column.accessorFn` and
 * the like: under `strictFunctionTypes`, `TableInstance<Testimonial>` stops being a
 * `TableInstance<RowData>`. Keeping it here would cost an `as` or an `any` and
 * would erase the record type across the whole tree. It goes by prop, from parent to
 * child, in the three subcomponents that read it - and `row.original` stays typed.
 *
 * What is left is what has no generic at all: the route and the filters, which the
 * sortable header, the search, the trash and the pagination need in order to navigate.
 * Passing `to` and `search` in each `ColumnDef` would repeat both in every
 * column of every screen - and the column declaration lives outside the component,
 * far from where those values exist.
 */
export type TableContextValue = {
  /** This listing's route, for the sorting, search and pagination links. */
  to: string
  search: ListSearch
  /** The query is serving the previous page while it redoes the new one. */
  isPlaceholderData: boolean
  /**
   * The query failed.
   *
   * It lives here and not on each screen because the decision it governs is always the
   * same, and always in the same order: **error before empty**. A query that
   * failed also returns zero rows, and announcing "nenhum registro ainda" to
   * someone without a network invites registering again what already exists.
   */
  isError: boolean
  /** Redoes the query. Absent when the screen did not pass `onRetry`. */
  onRetry?: () => void
}

const TableContext = React.createContext<TableContextValue | null>(null)

export const TableProvider = TableContext.Provider

/**
 * The listing's route and filters, for whoever is inside `Table`.
 *
 * The `consumer` goes into the message so the error says **which** subcomponent was left
 * outside the provider - without it the `throw` reports "missing provider" and leaves the
 * search to whoever reads the stack.
 */
export function useTableContext(consumer: string): TableContextValue {
  const context = React.use(TableContext)

  if (!context) {
    throw new Error(`\`${consumer}\` must be used within \`Table\``)
  }

  return context
}
