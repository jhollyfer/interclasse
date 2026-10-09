import type * as React from 'react'
import type { Header, RowData } from '@tanstack/react-table'

import type { TableFeatures } from './use-table'

import { cn } from '#/lib/utils'

/**
 * A alça de redimensionar, na borda direita do cabeçalho.
 *
 * `touch-none` e `select-none` não são estética: sem o primeiro, arrastar no
 * celular rola a página em vez de mover a alça; sem o segundo, o arrasto
 * seleciona o texto do cabeçalho ao lado.
 *
 * Duplo clique devolve a coluna ao tamanho declarado - é a saída de quem
 * arrastou demais e não sabe mais qual era a largura original.
 */
export function TableResizeHandle<TRow extends RowData>({
  header,
}: {
  header: Header<TableFeatures, TRow, unknown>
}): React.JSX.Element {
  const isResizing = header.column.getIsResizing()

  return (
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
