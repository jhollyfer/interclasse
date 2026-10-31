import { XIcon } from '@phosphor-icons/react'
import type { ColumnDef, RowData } from '@tanstack/react-table'
import type * as React from 'react'

import { Button } from '#/components/ui/button'
import { ButtonGroup, ButtonGroupText } from '#/components/ui/button-group'
import { Checkbox } from '#/components/ui/checkbox'
import { m } from '#/paraglide/messages'

import type { TableFeatures, TableInstance } from './use-table'

/**
 * The column of selection checkboxes, to spread before the screen's columns.
 *
 * `enableHiding: false` and `enableResizing: false`: it is a table anchor, not
 * content - hiding the selection would leave the bulk actions unreachable, and
 * resizing a 16px checkbox makes no sense.
 *
 * Indeterminate is `some && !all` because in v9 `getIsSomePageRowsSelected()`
 * came to mean **at least one**, including when all are selected. Using it
 * alone would leave the box dashed even with the whole page ticked.
 */
export function selectionColumn<TRow extends RowData>(): ColumnDef<
  TableFeatures,
  TRow
> {
  return {
    id: '_select',
    size: 40,
    enableHiding: false,
    enableResizing: false,
    header: ({ table }) => {
      const some = table.getIsSomePageRowsSelected()
      const all = table.getIsAllPageRowsSelected()

      return (
        <Checkbox
          checked={all}
          // In Base UI the dash is a separate prop, and not a third value of
          // `checked` - the component only accepts a boolean there.
          indeterminate={some && !all}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={m.table_select_all()}
        />
      )
    },
    cell: ({ row }) => (
      // Clicking the checkbox must not also open the record.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- only contains the click: the keyboard does not cross the border
      <div onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          // The `selectable` predicate arrives here: a row the API would refuse to
          // archive does not enter the selection, and the checkbox says so before the click.
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={m.table_select_row()}
        />
      </div>
    ),
  }
}

type TableSelectionBarProps<TRow extends RowData> = Readonly<{
  table: TableInstance<TRow>
  /** O nome do recurso no singular e no plural: `['tabela', 'tabelas']`. */
  noun: [string, string]
  /** The action buttons. They receive the selected rows. */
  children: (rows: ReadonlyArray<TRow>) => React.ReactNode
}>

/**
 * The bar that appears when rows are selected.
 *
 * `sticky bottom-4` inside the scrolling area: it follows the list instead of
 * being stuck at its end, so it stays reachable with 50 rows on screen.
 *
 * It disappears on its own when the selection drops to zero - there is no "open and empty
 * bar" state to maintain.
 */
export function TableSelectionBar<TRow extends RowData>({
  table,
  noun,
  children,
}: TableSelectionBarProps<TRow>): React.JSX.Element | null {
  const selected = table.getSelectedRowModel().rows
  const count = selected.length

  if (count === 0) return null

  const [singular, plural] = noun

  /**
   * "Seleção:" and not "selecionadas": the reference fixes the participle in the feminine,
   * which here would give "3 eventos selecionadas" in six of the seven resources. Putting a
   * gender in `noun` would be a design the reference does not have; the form without a
   * participle agrees with both and says the same thing.
   */
  let name = plural
  if (count === 1) name = singular
  const label = m.table_selection({ count, noun: name })

  return (
    // Action bar over the selection, and hence `ButtonGroup`. The children
    // enter in nested groups because they are independent actions - gluing them
    // would draw a segmented control, which is something else.
    <ButtonGroup
      data-slot="table-selection-bar"
      data-test-id="selection-bar"
      className="sticky bottom-4 z-sticky mx-auto max-w-bar flex-wrap items-center justify-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg"
    >
      <ButtonGroupText className="border-0 bg-transparent px-0 text-sm font-medium">
        {label}
      </ButtonGroupText>

      <ButtonGroup>{children(selected.map((row) => row.original))}</ButtonGroup>

      <ButtonGroup>
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.table_selection_clear()}
          onClick={() => table.resetRowSelection()}
        >
          <XIcon />
        </Button>
      </ButtonGroup>
    </ButtonGroup>
  )
}
