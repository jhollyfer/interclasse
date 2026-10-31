import type { Merge } from '@interclasse/shared'
import * as React from 'react'

import { PageShell } from '#/components/common/page-shell'
import type { ListSearch } from '#/lib/list-search'

import { TableProvider } from './table-context'

type TableProps = Readonly<
  Merge<
    Omit<
      React.ComponentProps<typeof PageShell>,
      'to' | 'search' | 'isPlaceholderData' | 'isError' | 'onRetry'
    >,
    {
      /** This listing's route, for search, sorting and pagination. */
      to: string
      search: ListSearch
      /** The query is serving the previous page while it redoes the new one. */
      isPlaceholderData?: boolean
      /** The query failed. Swaps the content area for the error state. */
      isError?: boolean
      /** Redoes the query, on the error state's button. */
      onRetry?: () => void
    }
  >
>

/**
 * The root of a dashboard listing: holds the route and the filters, and draws the
 * shell with fixed header, scrolling content and fixed footer.
 *
 * The consumer assembles the parts in whatever order it wants - `TableHeader`,
 * `TableToolbar`, `TableContent`, `TablePagination` - and none of them receives
 * `to` or `search`: all read from here.
 *
 * The table instance does **not** go through this context; it goes by prop to the
 * three subcomponents that read it, for the reason written in `table-context.ts`.
 */
export function Table({
  to,
  search,
  isPlaceholderData = false,
  isError = false,
  onRetry,
  children,
  ...rest
}: TableProps): React.JSX.Element {
  // No `useMemo`: the React Compiler memoizes the object by what it reads.
  const value = { to, search, isPlaceholderData, isError, onRetry }

  return (
    <TableProvider value={value}>
      <PageShell data-slot="table" {...rest}>
        {children}
      </PageShell>
    </TableProvider>
  )
}
