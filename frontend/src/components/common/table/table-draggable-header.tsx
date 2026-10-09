import type * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DotsSixVerticalIcon } from '@phosphor-icons/react'
import type { Header, RowData } from '@tanstack/react-table'

import type { TableFeatures } from './use-table'

import { Button } from '#/components/ui/button'
import { ButtonGroup } from '#/components/ui/button-group'
import { cn } from '#/lib/utils'

type TableDraggableHeaderProps<TRow extends RowData> = {
  header: Header<TableFeatures, TRow, unknown>
  children: React.ReactNode
}

/**
 * A alça de arrastar coluna, à esquerda do título.
 *
 * Coluna **fixada não arrasta**: ela saiu do fluxo horizontal para ficar parada
 * na borda, e reordená-la moveria uma coluna que a pessoa não está vendo se
 * mexer. Coluna que não pode ser escondida (seleção, ações) também não arrasta -
 * são âncoras da tabela, não conteúdo.
 *
 * A alça aparece no hover da célula de cabeçalho (`group/th`), e não sempre:
 * seis pontinhos em toda coluna competem com o título pela atenção.
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
          aria-label={`Mover coluna ${header.column.id}`}
          className={cn(
            '-ml-1 size-5 cursor-grab opacity-0 transition-opacity',
            'group-hover/th:opacity-100 active:cursor-grabbing',
            // Sem isto o punho é invisível para quem navega por teclado: ele
            // está na ordem de tabulação, tem `aria-label`, e só aparecia no
            // hover do mouse - o foco parava num botão que não existia na tela.
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
