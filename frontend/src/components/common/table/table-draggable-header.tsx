import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DotsSixVerticalIcon } from '@phosphor-icons/react'
import type { Header, RowData } from '@tanstack/react-table'
import type * as React from 'react'

import { Button } from '#/components/ui/button'
import { ButtonGroup } from '#/components/ui/button-group'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import type { TableFeatures } from './use-table'

type TableDraggableHeaderProps<TRow extends RowData> = Readonly<{
  header: Header<TableFeatures, TRow, unknown>
  children: React.ReactNode
}>

/**
 * The column drag handle, to the left of the title.
 *
 * A **pinned column does not drag**: it left the horizontal flow to stay still
 * on the edge, and reordering it would move a column the person does not see
 * moving. A column that cannot be hidden (selection, actions) does not drag either -
 * they are table anchors, not content.
 *
 * The handle appears on hover of the header cell (`group/th`), and not always:
 * six little dots on every column compete with the title for attention.
 */
export function TableDraggableHeader<TRow extends RowData>({
  header,
  children,
}: TableDraggableHeaderProps<TRow>): React.JSX.Element {
  const isPinned = Boolean(header.column.getIsPinned())
  const canDrag = header.column.getCanHide() && !isPinned

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: header.column.id, disabled: !canDrag })

  let opacity = 1
  if (isDragging) opacity = 0.5

  return (
    <ButtonGroup
      data-slot="table-draggable-header"
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity,
      }}
      className="w-full items-center gap-0.5"
    >
      {canDrag && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          data-test-id={`drag-${header.column.id}`}
          aria-label={m.table_move_column({ column: header.column.id })}
          className={cn(
            '-ml-1 size-5 cursor-grab opacity-0 transition-opacity',
            'group-hover/th:opacity-100 active:cursor-grabbing',
            // Without this the handle is invisible to keyboard users: it
            // is in the tab order, has `aria-label`, and only showed up on
            // mouse hover - focus landed on a button that did not exist on screen.
            'focus-visible:opacity-100',
            'motion-reduce:transition-none',
          )}
          {...attributes}
          {...listeners}
        >
          <DotsSixVerticalIcon className="size-3 text-muted-foreground" />
        </Button>
      )}
      {children}
    </ButtonGroup>
  )
}
