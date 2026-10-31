import type { PaginationMeta } from '@interclasse/shared'
import type * as React from 'react'

import { PageShellFooter } from '#/components/common/page-shell'

import { useTableContext } from './table-context'
import { Pagination } from './table-pagination-nav'

/**
 * The fixed footer with the pagination.
 *
 * `meta` comes by prop, and not from the context, because it is the query's response and not
 * table state: until the first page arrives it does not exist, and the
 * footer simply does not appear.
 */
export function TablePagination({
  meta,
}: Readonly<{
  meta: PaginationMeta | undefined
}>): React.JSX.Element | null {
  const { to, search } = useTableContext('TablePagination')

  if (!meta) return null

  return (
    <PageShellFooter data-slot="table-pagination">
      <Pagination meta={meta} search={search} to={to} />
    </PageShellFooter>
  )
}
