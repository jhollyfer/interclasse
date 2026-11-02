import { FlexRender } from '@tanstack/react-table'
import type { RowData } from '@tanstack/react-table'
import type * as React from 'react'

import { cn } from '#/lib/cn'

import type { TableInstance } from './use-table'

type TableMobileCardsProps<TRow extends RowData> = Readonly<{
  table: TableInstance<TRow>
  onRowClick?: (row: TRow) => void
}>

/** More fields than this and the card goes back to being a long list. */
const MAX_FIELDS = 3

/**
 * The same table, as one compact card per row, for narrow screens.
 *
 * A seven-column table on a phone becomes either endless horizontal scrolling or
 * 8px text. The card keeps the columns' own `cell`s, so nothing is duplicated, and
 * **which** columns play which part comes from `meta` of the column definition:
 * `primary` is the title (or the first data column), `mobile: 'subtitle'` goes under it,
 * `mobile: 'badge'` in the top corner, `mobile: 'hidden'` stays out, and the rest
 * (`'field'` is the default) go to a two-column grid, up to `MAX_FIELDS`.
 *
 * The **display** columns - selection, actions, everything without an `accessorFn` -
 * sit next to the badge, in the corner: they have no label, and a `: ` with nothing
 * before it is orphaned.
 */
export function TableMobileCards<TRow extends RowData>({
  table,
  onRowClick,
}: TableMobileCardsProps<TRow>): React.JSX.Element {
  const rows = table.getRowModel().rows

  const labels = new Map<string, string>()
  for (const column of table.getAllColumns()) {
    const label = column.columnDef.meta?.label
    if (label) labels.set(column.id, label)
  }

  return (
    <div data-slot="table-mobile-cards" className="flex flex-col gap-2 p-1">
      {rows.map((row, index) => {
        const cells = row.getVisibleCells()
        const controls = cells.filter((cell) => !cell.column.accessorFn)
        const valueCells = cells.filter(
          (cell) =>
            cell.column.accessorFn &&
            cell.column.columnDef.meta?.mobile !== 'hidden',
        )
        // The `primary` column, else the first one without a part of its own, else the first.
        const title =
          valueCells.find((cell) => cell.column.columnDef.meta?.primary) ??
          valueCells.find((cell) => !cell.column.columnDef.meta?.mobile) ??
          valueCells.at(0)
        const subtitle = valueCells.find(
          (cell) =>
            cell !== title && cell.column.columnDef.meta?.mobile === 'subtitle',
        )
        const badge = valueCells.find(
          (cell) =>
            cell !== title && cell.column.columnDef.meta?.mobile === 'badge',
        )
        const fields = valueCells
          .filter(
            (cell) => cell !== title && cell !== subtitle && cell !== badge,
          )
          .slice(0, MAX_FIELDS)

        let state: 'selected' | undefined = undefined
        if (row.getIsSelected()) state = 'selected'

        return (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- mouse shortcut: the row menu gives the keyboard the same action
          <div
            key={row.id}
            data-test-id={`table-card-${index}`}
            data-state={state}
            className={cn(
              'flex flex-col gap-2 rounded-lg border bg-card p-3',
              'data-[state=selected]:border-primary data-[state=selected]:bg-muted/40',
              onRowClick && 'cursor-pointer',
            )}
            onClick={() => onRowClick?.(row.original)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {title && (
                  <div
                    data-slot="table-mobile-card-title"
                    className="min-w-0 font-medium"
                  >
                    <FlexRender cell={title} />
                  </div>
                )}
                {subtitle && (
                  <div
                    data-slot="table-mobile-card-subtitle"
                    className="min-w-0 text-xs break-words text-muted-foreground"
                  >
                    <FlexRender cell={subtitle} />
                  </div>
                )}
              </div>
              {(badge || controls.length > 0) && (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- only contains the click: the keyboard does not cross the border
                <div
                  className="flex shrink-0 items-center justify-end gap-1"
                  // Clicking the selection checkbox or the menu must not also open
                  // the record.
                  onClick={(event) => event.stopPropagation()}
                >
                  {badge && (
                    <div data-slot="table-mobile-card-badge">
                      <FlexRender cell={badge} />
                    </div>
                  )}
                  {controls.map((cell) => (
                    <div key={cell.id}>
                      <FlexRender cell={cell} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {fields.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {fields.map((cell) => (
                  <div key={cell.id} className="flex min-w-0 flex-col">
                    <dt className="truncate text-xs font-medium text-muted-foreground">
                      {labels.get(cell.column.id) ?? cell.column.id}
                    </dt>
                    <dd className="min-w-0 text-sm break-words">
                      <FlexRender cell={cell} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )
      })}
    </div>
  )
}
