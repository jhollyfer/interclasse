import { SORT_DIRECTION } from '@interclasse/shared'
import type { SortDirection } from '@interclasse/shared'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  PushPinIcon,
  PushPinSlashIcon,
} from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import type { Column, RowData } from '@tanstack/react-table'
import type * as React from 'react'

import { Button } from '#/components/ui/button'
import { ButtonGroup, ButtonGroupText } from '#/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { m } from '#/paraglide/messages'

import { useTableContext } from './table-context'
import type { TableFeatures } from './use-table'

type TableColumnHeaderProps<TRow extends RowData> = Readonly<{
  /** The column's label. */
  children: React.ReactNode
  /**
   * The backend column behind this one. When absent, the header is just the title -
   * not every screen column exists as a column in the database.
   */
  sortKey?: string
  column?: Column<TableFeatures, TRow, unknown>
}>

/**
 * A column header: title, sorting and pinning.
 *
 * **The order goes to the URL, not to the table.** Registering `rowSortingFeature`
 * would sort the 20 rows of the page in hand - row 21, which is on the next
 * page, would show up out of place. The menu writes `?sort` and `?direction`, the
 * loader redoes the query, and the backend returns the right page already sorted.
 *
 * Pinning, on the other hand, is a screen decision and lives in the table: which
 * column stays visible when scrolling horizontally is not a question the server
 * answers.
 */
export function TableColumnHeader<TRow extends RowData>({
  children,
  sortKey,
  column,
}: TableColumnHeaderProps<TRow>): React.JSX.Element {
  const { to, search } = useTableContext('TableColumnHeader')
  const navigate = useNavigate()

  const pinned = column?.getIsPinned()
  const canPin = Boolean(column)

  // With neither a database column nor a table column there is no menu to offer.
  if (!sortKey && !canPin)
    return <span className="font-medium">{children}</span>

  let direction: SortDirection | undefined = undefined
  if (sortKey && search.sort === sortKey) direction = search.direction

  function sort(next: SortDirection): void {
    void navigate({
      to,
      // The order changes page 1 as much as the filter does: keeping `page` would lead to
      // a page that no longer exists in the new order.
      search: { ...search, sort: sortKey, direction: next, page: undefined },
    })
  }

  return (
    <ButtonGroup
      data-slot="table-column-header"
      data-test-id={`column-header-${column?.id ?? sortKey}`}
      className="items-center gap-0.5"
    >
      <ButtonGroupText className="border-0 bg-transparent px-0 font-medium">
        {children}
      </ButtonGroupText>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              // The plain-text label comes from `meta.label` - what the slot receives
              // is markup, and `String(element)` would give `[object Object]`.
              aria-label={m.table_column_options({
                column:
                  column?.columnDef.meta?.label ?? m.table_column_fallback(),
              })}
            >
              {direction === SORT_DIRECTION.ASC && <ArrowUpIcon />}
              {direction === SORT_DIRECTION.DESC && <ArrowDownIcon />}
              {!direction && <ArrowsDownUpIcon className="opacity-40" />}
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          {sortKey && (
            <>
              <DropdownMenuItem
                data-test-id="sort-asc"
                onClick={() => sort(SORT_DIRECTION.ASC)}
              >
                <ArrowUpIcon />
                {m.table_sort_asc()}
              </DropdownMenuItem>
              <DropdownMenuItem
                data-test-id="sort-desc"
                onClick={() => sort(SORT_DIRECTION.DESC)}
              >
                <ArrowDownIcon />
                {m.table_sort_desc()}
              </DropdownMenuItem>
            </>
          )}

          {sortKey && canPin && <DropdownMenuSeparator />}

          {/*
            `start`/`end` and not `left`/`right`: in v9 pinning is logical, so
            it follows the text direction instead of nailing one side of the screen.
          */}
          {canPin && pinned !== 'start' && (
            <DropdownMenuItem onClick={() => column?.pin('start')}>
              <PushPinIcon />
              {m.table_pin_start()}
            </DropdownMenuItem>
          )}
          {canPin && pinned !== 'end' && (
            <DropdownMenuItem onClick={() => column?.pin('end')}>
              <PushPinIcon className="rotate-90" />
              {m.table_pin_end()}
            </DropdownMenuItem>
          )}
          {canPin && pinned && (
            <DropdownMenuItem onClick={() => column?.pin(false)}>
              <PushPinSlashIcon />
              {m.table_unpin()}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}
