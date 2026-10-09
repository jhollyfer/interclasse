import * as React from 'react'
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

import { TableDraggableHeader } from './table-draggable-header'
import { TableMobileCards } from './table-mobile-cards'
import { TableResizeHandle } from './table-resize-handle'
import type { TableFeatures, TableInstance } from './use-table'

// As primitivas do catálogo entram apelidadas: os nomes crus (`Table`,
// `TableHeader`, `TableBody`) são os do compound desta pasta, e é o compound
// que os consumidores importam.
import {
  Table as TableRoot,
  TableBody as BodyRoot,
  TableCell as CellRoot,
  TableHead as HeadRoot,
  TableHeader as HeaderRoot,
  TableRow as RowRoot,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'

type TableGridProps<TRow extends RowData> = {
  table: TableInstance<TRow>
  /** Abre o registro ao clicar na linha. */
  onRowClick?: (row: TRow) => void
}

/**
 * A posição de uma coluna fixada, em propriedades **lógicas**.
 *
 * `inset-inline-start` e não `left`: na v9 a fixação é lógica (`start`/`end`), e
 * cravar `left` deixaria a coluna do lado errado num layout da direita para a
 * esquerda. Devolve `undefined` quando a coluna não está fixada, para o `style`
 * não escrever propriedade nenhuma.
 */
function pinnedStyle<TRow extends RowData>(
  item:
    Header<TableFeatures, TRow, unknown> | Cell<TableFeatures, TRow, unknown>,
  zIndex: number,
): React.CSSProperties {
  const column = item.column
  const pinned = column.getIsPinned()

  const style: React.CSSProperties = {
    width: `calc(var(--col-${column.id}-size) * 1px)`,
  }

  if (!pinned) return style

  style.position = 'sticky'
  style.zIndex = zIndex

  if (pinned === 'start')
    style.insetInlineStart = `${column.getStart('start')}px`
  if (pinned === 'end') style.insetInlineEnd = `${column.getAfter('end')}px`

  return style
}

/**
 * A tabela do painel: cabeçalho fixo, colunas fixáveis, redimensionáveis e
 * arrastáveis, e cards no lugar dela abaixo de `sm`.
 *
 * As larguras viajam por **variável CSS** (`--col-<id>-size`) declarada uma vez
 * no `<table>`, e não por `style` em cada célula. Numa tabela de 20 linhas por 8
 * colunas isso é a diferença entre reescrever um valor e reescrever 160 a cada
 * pixel de arrasto.
 *
 * Elas são recalculadas a cada render, sem `useMemo`: são oito chamadas de
 * `getSize()`, e memoizar exigiria declarar de que estado elas dependem - o que
 * a v9 não expõe (não há `getState()`). Um `useMemo` com a dependência errada
 * congelaria a largura durante o arrasto, que é justamente quando ela precisa
 * acompanhar.
 */
export function TableGrid<TRow extends RowData>({
  table,
  onRowClick,
}: TableGridProps<TRow>): React.JSX.Element | null {
  const columnSizeVars: Record<string, number> = {}
  for (const header of table.getFlatHeaders()) {
    columnSizeVars[`--col-${header.column.id}-size`] = header.column.getSize()
  }

  const sensors = useSensors(
    // Cinco pixels antes de começar a arrastar: sem a distância mínima, um
    // clique no menu de coluna vira um arrasto de um pixel e o menu não abre.
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

  // Lista vazia é assunto do `TableEmpty`, que lê a contagem da mesma
  // instância. Uma tabela com só o cabeçalho ao lado dele seria o vazio
  // desenhado duas vezes.
  if (rows.length === 0) return null

  const wide = (
    <div
      data-slot="table"
      data-test-id="data-table"
      // Quem rola a lista passou a ser este elemento, e não o
      // `PageShellContent` - então o nome da rolagem tem de vir junto. Sem ele
      // o router identifica o elemento por um seletor de `nth-child` montado
      // subindo a árvore, e basta a tela renderizar com um filho a mais numa
      // visita - a barra de seleção é condicional - para a volta cair no topo
      // da lista em vez de onde a pessoa estava. Ver `page-shell.tsx`.
      data-scroll-restoration-id="table-grid"
      // **Um contêiner de rolagem só, e é o que faz o cabeçalho grudar.**
      // `ui/table.tsx` já envolve a `<table>` num `overflow-x-auto` próprio, e
      // dois contêineres aninhados deixavam o `sticky top-0` do `<thead>`
      // ancorado no de dentro - que tem altura automática e por isso nunca
      // rola. O `overflow-visible` neutraliza o de dentro; quem rola nos dois
      // eixos passa a ser este, e a fixação de coluna e a de cabeçalho voltam a
      // medir contra o mesmo elemento.
      //
      // `min-h-0 flex-1` é o par disso: sem altura limitada, este elemento
      // cresce com a lista e um contêiner que cresce não rola nada.
      className="relative hidden min-h-0 w-full flex-1 overflow-auto rounded-xl border [&>[data-slot=table-container]]:overflow-visible sm:block"
    >
      <TableRoot
        className="table-fixed"
        // `table-layout: fixed` mais uma largura explícita, e não `w-full`
        // sozinho. Em auto layout o `width` de uma célula é sugestão: com
        // `whitespace-nowrap` em toda `<td>`, um título longo vence a largura
        // declarada e alarga a tabela inteira. Fixo, as variáveis `--col-*-size`
        // viram largura de verdade.
        //
        // `minWidth: '100%'` para a tabela mais estreita que a moldura ainda
        // preencher a moldura, em vez de deixar uma faixa vazia à direita.
        style={{
          ...columnSizeVars,
          width: table.getTotalSize(),
          minWidth: '100%',
        }}
      >
        <HeaderRoot className="sticky top-0 z-20 bg-background">
          {table.getHeaderGroups().map((group) => (
            <RowRoot key={group.id}>
              {group.headers.map((header) => (
                <HeadRoot
                  key={header.id}
                  style={pinnedStyle(header, 30)}
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
                    style={pinnedStyle(cell, 10)}
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
