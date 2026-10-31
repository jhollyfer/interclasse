import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { FlexRender } from '@tanstack/react-table'
import type { Cell, Header, RowData } from '@tanstack/react-table'
import * as React from 'react'

import {
  Table as TableRoot,
  TableBody as BodyRoot,
  TableCell as CellRoot,
  TableHead as HeadRoot,
  TableHeader as HeaderRoot,
  TableRow as RowRoot,
} from '#/components/ui/table'
import { cn } from '#/lib/cn'

import { TableDraggableHeader } from './table-draggable-header'
import { TableMobileCards } from './table-mobile-cards'
import { TableResizeHandle } from './table-resize-handle'
import type { TableFeatures, TableInstance } from './use-table'

// The catalog primitives come in aliased: the raw names (`Table`,
// `TableHeader`, `TableBody`) are those of this folder's compound, and it is the compound
// that consumers import.

type TableGridProps<TRow extends RowData> = Readonly<{
  table: TableInstance<TRow>
  /** Opens the record when the row is clicked. */
  onRowClick?: (row: TRow) => void
}>

/**
 * The layer of a pinned column, from the theme's named scale (`z-*` in
 * `styles.css`): the pinned header sits above the body's pinned cells.
 */
const PIN_LAYERS = {
  header: 'var(--z-sticky)',
  cell: '1',
} as const

type PinLayer = keyof typeof PIN_LAYERS

/**
 * The position of a pinned column, in **logical** properties.
 *
 * `inset-inline-start` and not `left`: in v9 pinning is logical (`start`/`end`), and
 * nailing `left` would leave the column on the wrong side in a right-to-left
 * layout. Returns `undefined` when the column is not pinned, so `style`
 * writes no property at all.
 */
function pinnedStyle<TRow extends RowData>(
  item:
    Header<TableFeatures, TRow, unknown> | Cell<TableFeatures, TRow, unknown>,
  layer: PinLayer,
): React.CSSProperties {
  const column = item.column
  const pinned = column.getIsPinned()

  const style: React.CSSProperties = {
    width: `var(--col-${column.id}-size)`,
  }

  if (!pinned) return style

  style.position = 'sticky'
  style.zIndex = PIN_LAYERS[layer]

  if (pinned === 'start')
    style.insetInlineStart = `${column.getStart('start')}px`
  if (pinned === 'end') style.insetInlineEnd = `${column.getAfter('end')}px`

  return style
}

/**
 * The dashboard table: fixed header, pinnable, resizable and
 * draggable columns, and cards in its place below `sm`.
 *
 * Widths travel by **CSS variable** (`--col-<id>-size`) declared once
 * on the `<table>`, and not by `style` on every cell. In a table of 20 rows by 8
 * columns that is the difference between rewriting one value and rewriting 160 on every
 * pixel of dragging.
 *
 * They are recalculated on every render, without `useMemo`: it is eight calls to
 * `getSize()`, and memoizing would require declaring which state they depend on - which
 * v9 does not expose (there is no `getState()`). A `useMemo` with the wrong dependency
 * would freeze the width during the drag, which is precisely when it has to
 * follow.
 */
export function TableGrid<TRow extends RowData>({
  table,
  onRowClick,
}: TableGridProps<TRow>): React.JSX.Element | null {
  const columnSizeVars: Record<string, string> = {}
  for (const header of table.getFlatHeaders()) {
    columnSizeVars[`--col-${header.column.id}-size`] =
      `${header.column.getSize()}px`
  }

  const sensors = useSensors(
    // Five pixels before starting to drag: without the minimum distance, a
    // click on the column menu becomes a one-pixel drag and the menu does not open.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const columnIds = table.getVisibleFlatColumns().map((column) => column.id)

  function onDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const order = [...columnIds]
    const from = order.indexOf(String(active.id))
    const to_ = order.indexOf(String(over.id))

    if (from === -1 || to_ === -1) return

    order.splice(from, 1)
    order.splice(to_, 0, String(active.id))

    table.setColumnOrder(order)
  }

  const rows = table.getRowModel().rows

  // An empty list is `TableEmpty`'s business, which reads the count from the same
  // instance. A table with only the header next to it would be the empty state
  // drawn twice.
  if (rows.length === 0) return null

  const wide = (
    <div
      data-slot="table-grid"
      data-test-id="data-table"
      // What scrolls the list became this element, and not
      // `PageShellContent` - so the scroll's name has to come along. Without it
      // the router identifies the element by an `nth-child` selector built by
      // climbing the tree, and it is enough for the screen to render with one extra child on a
      // visit - the selection bar is conditional - for the return to land at the top
      // of the list instead of where the person was. See `page-shell.tsx`.
      data-scroll-restoration-id="table-grid"
      // **A single scroll container, and it is what makes the header stick.**
      // `ui/table.tsx` already wraps the `<table>` in its own `overflow-x-auto`, and
      // two nested containers left the `<thead>`'s `sticky top-0`
      // anchored to the inner one - which has automatic height and so never
      // scrolls. `overflow-visible` neutralizes the inner one; what scrolls on both
      // axes becomes this one, and column pinning and header pinning go back to
      // measuring against the same element.
      //
      // `min-h-0 flex-1` is its pair: without a bounded height, this element
      // grows with the list and a container that grows scrolls nothing.
      className="relative hidden min-h-0 w-full flex-1 overflow-auto rounded-xl border [&>[data-slot=table-container]]:overflow-visible sm:block"
    >
      <TableRoot
        className="table-fixed"
        // `table-layout: fixed` plus an explicit width, and not `w-full`
        // alone. In auto layout a cell's `width` is a suggestion: with
        // `whitespace-nowrap` on every `<td>`, a long title beats the declared
        // width and widens the whole table. Fixed, the `--col-*-size` variables
        // become real width.
        //
        // `minWidth: '100%'` so a table narrower than the frame still
        // fills the frame, instead of leaving an empty strip on the right.
        style={{
          ...columnSizeVars,
          width: table.getTotalSize(),
          minWidth: '100%',
        }}
      >
        <HeaderRoot className="sticky top-0 z-sticky bg-background">
          {table.getHeaderGroups().map((group) => (
            <RowRoot key={group.id}>
              {group.headers.map((header) => (
                <HeadRoot
                  key={header.id}
                  style={pinnedStyle(header, 'header')}
                  className={cn(
                    'group/th relative',
                    header.column.getIsPinned() && 'bg-background',
                  )}
                >
                  {!header.isPlaceholder && (
                    <TableDraggableHeader header={header}>
                      <FlexRender header={header} />
                    </TableDraggableHeader>
                  )}
                  {header.column.getCanResize() && (
                    <TableResizeHandle header={header} />
                  )}
                </HeadRoot>
              ))}
            </RowRoot>
          ))}
        </HeaderRoot>

        <BodyRoot>
          {rows.map((row, index) => {
            let rowState: 'selected' | undefined = undefined
            if (row.getIsSelected()) rowState = 'selected'

            return (
              <RowRoot
                key={row.id}
                data-test-id={`table-row-${index}`}
                data-state={rowState}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <CellRoot
                    key={cell.id}
                    style={pinnedStyle(cell, 'cell')}
                    className={cn(cell.column.getIsPinned() && 'bg-background')}
                  >
                    <FlexRender cell={cell} />
                  </CellRoot>
                ))}
              </RowRoot>
            )
          })}
        </BodyRoot>
      </TableRoot>
    </div>
  )

  return (
    <React.Fragment>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={columnIds}
          strategy={horizontalListSortingStrategy}
        >
          {wide}
        </SortableContext>
      </DndContext>

      <div className="sm:hidden">
        <TableMobileCards table={table} onRowClick={onRowClick} />
      </div>
    </React.Fragment>
  )
}
