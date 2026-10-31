import { TableLayout } from '@interclasse/shared'
import {
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  tableFeatures as tableFeaturesRoot,
  useTable as useTableRoot,
} from '@tanstack/react-table'
import type {
  ColumnDef,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  RowData,
  RowSelectionState,
  ColumnVisibilityState,
} from '@tanstack/react-table'
import * as React from 'react'

import { readLocal, writeLocal } from '#/lib/local-store'
import { m } from '#/paraglide/messages'

import { selectionColumn } from './table-selection'

/**
 * The features registered on the dashboard tables.
 *
 * **Sorting and filtering are not here, and that is on purpose.** The backend
 * paginates: sorting the 20 rows in hand would give an order that only holds for them, and
 * row 21 would show up out of place on the next page. The header writes
 * `?sort` to the URL and the loader redoes the query - see `table-column-header.tsx`.
 *
 * `rowPaginationFeature` stays out for the same reason: in manual mode the table
 * must not slice anything, it already receives the finished page.
 *
 * What is left is layout - what the person arranges on screen and expects to find
 * again tomorrow - plus selection, which is ephemeral.
 */
export const tableFeatures = tableFeaturesRoot({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnPinningFeature,
  rowSelectionFeature,
})

export type TableFeatures = typeof tableFeatures

export type TableColumns<TRow extends RowData> = Array<
  ColumnDef<TableFeatures, TRow>
>

/** What persists between sessions. Selection is not included: it dies with the page. */
type PersistedLayout = TableLayout

/**
 * The layout theme in `lib/local-store.ts`, which builds the key
 * `interclasse:data-table:<resource>:v1`.
 *
 * The new key deliberately discards the layout saved before (`data-table:v2:`):
 * a saved `columnVisibility['_actions'] === false` hid the actions menu
 * **forever**, because `table-core` consults the saved state before looking at
 * the column definition, and `enableHiding: false` protected nothing
 * (`features/column-visibility/columnVisibilityFeature.utils.js`,
 * `column_getIsVisible`). When the format changes again, bump the `v1` there.
 */
const THEME_PREFIX = 'data-table:'

/**
 * The columns this shell assembles on its own. They are not content, they are anchors: without the
 * selection checkbox the bulk action bar is unreachable, and without the actions
 * menu the row has no way to be edited or archived.
 */
const ANCHOR_COLUMNS = ['_select', '_actions']

/** The range in which a saved width is still a width. */
const MIN_COLUMN_SIZE = 40
const MAX_COLUMN_SIZE = 640

/**
 * Reads the saved layout, validated and sanitized. Returns empty on any failure - corrupted
 * JSON or JSON outside the shape must not bring the screen down, and the cost of getting it wrong is
 * the table opening with the default.
 *
 * The sanitizing exists because this data survives a deploy: a preference
 * saved on a bad day keeps holding months later. Two rules are enough for
 * what has already bitten: an anchor does not stay invisible, and a width stays within a
 * plausible range.
 */
function readLayout(key: string | undefined): PersistedLayout {
  if (!key) return {}

  const saved = readLocal({
    theme: THEME_PREFIX.concat(key),
    schema: TableLayout,
    fallback: {},
  })

  let columnVisibility = saved.columnVisibility
  if (columnVisibility) {
    columnVisibility = Object.fromEntries(
      Object.entries(columnVisibility).filter(
        ([id]) => !ANCHOR_COLUMNS.includes(id),
      ),
    )
  }

  let columnSizing = saved.columnSizing
  if (columnSizing) {
    columnSizing = Object.fromEntries(
      Object.entries(columnSizing).filter(
        ([, size]) => size >= MIN_COLUMN_SIZE && size <= MAX_COLUMN_SIZE,
      ),
    )
  }

  return { ...saved, columnVisibility, columnSizing }
}

function writeLayout(key: string | undefined, layout: PersistedLayout): void {
  if (!key) return

  writeLocal(THEME_PREFIX.concat(key), layout)
}

type UseTableOptions<TRow extends RowData> = {
  rows: ReadonlyArray<TRow>
  columns: TableColumns<TRow>
  getRowId: (row: TRow) => string
  /**
   * The saved layout's key (`'administrator:testimonials'`). When absent, nothing
   * persists - which is what is wanted in an ephemeral table, like a dialog's.
   */
  persistKey?: string
  /** Each row's actions menu, in the last column. */
  actions?: (row: TRow) => React.ReactNode
  /**
   * Turns on the selection checkbox and, with it, the bulk action bar.
   *
   * A predicate in place of `true` decides row by row, and is what `users`
   * uses: archiving one's own account is `403 SELF_ARCHIVE_FORBIDDEN`, so its
   * checkbox is born disabled. Filtering afterwards, at archive time, would give
   * a bar saying "3 selecionados" and a notice saying "2 arquivados".
   */
  selectable?: boolean | ((row: TRow) => boolean)
}

/**
 * The dashboard table: registered features, persisted layout, in-memory
 * selection.
 *
 * The layout starts from whatever is saved and is rewritten on every change, in a
 * single `useEffect`. Saving inside each `onChange` would be four write points
 * to keep in sync; one effect over the final state is one.
 *
 * Hydration is the reason the initial state does **not** read `localStorage`
 * directly: the server renders without it, and a different state on the client's first
 * render is a hydration mismatch. The layout enters after
 * mounting, in an effect.
 */
export function useTable<TRow extends RowData>({
  rows,
  columns,
  getRowId,
  persistKey,
  actions,
  selectable = false,
}: UseTableOptions<TRow>) {
  const hasActions = Boolean(actions)
  const hasSelection = Boolean(selectable)

  // Selection and actions are columns assembled here, and not requested from each screen: the
  // first is always the same and forgetting it would leave the bulk action bar
  // unreachable; the last used to be a loose `<TableHead/>` outside the column
  // model - invisible to pinning, width and order. No `useMemo`: the
  // React Compiler memoizes the array by the dependencies it reads
  // (_doc-lib/tanstack-table.md#framework/react/guide/react-compiler).
  const allColumns: TableColumns<TRow> = []

  if (hasSelection) allColumns.push(selectionColumn<TRow>())

  allColumns.push(...columns)

  if (hasActions) {
    allColumns.push({
      id: '_actions',
      size: 56,
      enableHiding: false,
      enableResizing: false,
      // The column exists and needs to announce itself. Without `header` the `<th>` came out
      // empty: for someone reading the table with a screen reader, the last column
      // had no name at all. `sr-only` because on screen the label would compete with
      // a 24px menu that the icon already explains.
      header: () => <span className="sr-only">{m.common_actions()}</span>,
      cell: ({ row }) => (
        // The menu must not trigger the row click behind it.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- only contains the click: the keyboard does not cross the border
        <div onClick={(event) => event.stopPropagation()}>
          {actions?.(row.original)}
        </div>
      ),
    })
  }

  // The selection checkbox and the menu stay visible when scrolling horizontally: without them
  // anchored, ticking the right row in a wide table becomes guesswork.
  const pinStart: Array<string> = []
  const pinEnd: Array<string> = []

  if (hasSelection) pinStart.push('_select')
  if (hasActions) pinEnd.push('_actions')

  let initialPinning: ColumnPinningState | undefined = undefined
  if (pinStart.length > 0 || pinEnd.length > 0)
    initialPinning = { start: pinStart, end: pinEnd }

  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  // The state default is assembled separately: `initialPinning ?? {}` widens the type
  // to `ColumnPinningState | {}`, and `useState` refuses the union.
  const emptyPinning: ColumnPinningState = { start: [], end: [] }
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    initialPinning ?? emptyPinning,
  )
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const [hydrated, setHydrated] = React.useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- the server does not have the saved layout: reading it in the initial state breaks hydration (frontend.md §3.2) */
  React.useEffect(() => {
    const saved = readLayout(persistKey)

    if (saved.columnVisibility) setColumnVisibility(saved.columnVisibility)
    if (saved.columnOrder) setColumnOrder(saved.columnOrder)
    if (saved.columnSizing) setColumnSizing(saved.columnSizing)
    if (saved.columnPinning) setColumnPinning(saved.columnPinning)

    setHydrated(true)
  }, [persistKey])
  /* eslint-enable react-hooks/set-state-in-effect -- end of the section that reads the saved layout */

  React.useEffect(() => {
    // Before hydrating, the state is still the default, and saving it would erase what
    // is saved.
    if (!hydrated) return

    writeLayout(persistKey, {
      columnVisibility,
      columnOrder,
      columnSizing,
      columnPinning,
    })
  }, [
    hydrated,
    persistKey,
    columnVisibility,
    columnOrder,
    columnSizing,
    columnPinning,
  ])

  // `selectable` accepts a boolean or a predicate, and TanStack accepts both in the
  // same prop — this is just the bridge between the two forms.
  let canSelectRow: boolean | ((row: { original: TRow }) => boolean) = false
  if (typeof selectable === 'boolean') canSelectRow = selectable
  if (typeof selectable === 'function') {
    const permite = selectable
    canSelectRow = (row) => permite(row.original)
  }

  return useTableRoot({
    features: tableFeatures,
    data: rows,
    columns: allColumns,
    getRowId,
    enableRowSelection: canSelectRow,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: {
      columnVisibility,
      columnOrder,
      columnSizing,
      columnPinning,
      rowSelection,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
    onRowSelectionChange: setRowSelection,
  })
}

export type TableInstance<TRow extends RowData> = ReturnType<
  typeof useTable<TRow>
>
