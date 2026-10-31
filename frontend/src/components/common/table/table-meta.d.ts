import type { CellData, RowData, TableFeatures } from '@tanstack/react-table'

/**
 * A column's label, in plain text.
 *
 * It exists because `header` stopped serving for that: it became a
 * component (`<TableColumnHeader/>`), and `String(element)` prints
 * `[object Object]` in the visible-columns menu. The label has to be data.
 *
 * `interface` and not `type` because module augmentation requires an interface - it is the
 * exception the project convention opens, along with the `Register`s of
 * TanStack Query and the router.
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    label?: string
    /** The column that becomes the card title on mobile. When absent, the first data column. */
    primary?: boolean
  }
}
