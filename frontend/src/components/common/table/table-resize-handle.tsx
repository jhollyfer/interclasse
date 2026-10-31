import type { Header, RowData } from '@tanstack/react-table'
import type * as React from 'react'

import { cn } from '#/lib/cn'

import type { TableFeatures } from './use-table'

/**
 * The resize handle, on the header's right edge.
 *
 * `touch-none` and `select-none` are not aesthetics: without the first, dragging on a
 * phone scrolls the page instead of moving the handle; without the second, dragging
 * selects the neighboring header's text.
 *
 * A double click returns the column to its declared size - it is the way out for whoever
 * dragged too far and no longer knows what the original width was.
 */
export function TableResizeHandle<TRow extends RowData>({
  header,
}: Readonly<{
  header: Header<TableFeatures, TRow, unknown>
}>): React.JSX.Element {
  const isResizing = header.column.getIsResizing()

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- resizing is a mouse and touch adjustment; the width has a default per column
    <div
      data-slot="table-resize-handle"
      data-test-id={`resize-${header.column.id}`}
      role="separator"
      aria-orientation="vertical"
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onDoubleClick={() => header.column.resetSize()}
      className={cn(
        'absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none',
        'opacity-0 transition-opacity group-hover/th:opacity-100 hover:bg-primary/50 motion-reduce:transition-none',
        isResizing && 'bg-primary opacity-100',
      )}
    />
  )
}
