import { TRASHED_MODE } from '@interclasse/shared'
import { useNavigate } from '@tanstack/react-router'
import type { RowData } from '@tanstack/react-table'
import type * as React from 'react'

import { EmptyState } from '#/components/common/empty-state'
import type { EmptyStateReason } from '#/components/common/empty-state'
import { Button } from '#/components/ui/button'
import { EmptyContent } from '#/components/ui/empty'
import { m } from '#/paraglide/messages'

import { useTableContext } from './table-context'
import type { TableInstance } from './use-table'

type TableEmptyProps<TRow extends RowData> = Readonly<{
  table: TableInstance<TRow>
  /** The text and action of a true empty - the filter and the trash have their own. */
  children?: React.ReactNode
}>

/**
 * What appears in place of the table when there is no row at all: the kit's
 * `EmptyState`, with the reason read from the URL's `search`.
 *
 * It decides on its own whether to render, reading the row count from the instance - an
 * `isEmpty` prop would be a second source of truth next to the table.
 */
export function TableEmpty<TRow extends RowData>({
  table,
  children,
}: TableEmptyProps<TRow>): React.JSX.Element | null {
  const { to, search } = useTableContext('TableEmpty')
  const navigate = useNavigate()

  // The filter beats the trash: searching inside it and finding nothing is a problem with the
  // term, not with the trash being empty.
  let reason: EmptyStateReason = 'empty'
  if (search.trashed === TRASHED_MODE.ONLY) reason = 'trash'
  if (search.search) reason = 'filtered'

  if (table.getRowModel().rows.length > 0) return null

  return (
    <EmptyState reason={reason}>
      {children}

      {reason === 'filtered' && (
        <EmptyContent className="mt-3">
          <Button
            variant="outline"
            onClick={() =>
              void navigate({
                to,
                search: { ...search, search: undefined, page: undefined },
              })
            }
          >
            {m.table_empty_filtered_action()}
          </Button>
        </EmptyContent>
      )}
    </EmptyState>
  )
}
