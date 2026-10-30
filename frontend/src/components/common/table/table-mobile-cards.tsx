import { FlexRender } from '@tanstack/react-table'
import type { RowData } from '@tanstack/react-table'
import type * as React from 'react'

import { cn } from '#/lib/cn'

import type { TableInstance } from './use-table'

type TableMobileCardsProps<TRow extends RowData> = Readonly<{
  table: TableInstance<TRow>
  onRowClick?: (row: TRow) => void
}>

/**
 * A mesma tabela, empilhada em `rótulo: valor`, para telas estreitas.
 *
 * Uma tabela de sete colunas num celular vira ou rolagem horizontal infinita ou
 * texto de 8px. Empilhar resolve, e sem duplicar nada: os mesmos `cell` das
 * colunas são reaproveitados, então uma coluna nova aparece aqui sozinha.
 *
 * As colunas **de exibição** - seleção, ações, tudo que não tem `accessorFn` -
 * vão no topo do card, e não na lista de pares: elas não têm rótulo, e um `: `
 * sem nada antes fica órfão. Ao lado delas vai o título: a célula da coluna
 * `meta.primary`, ou da primeira de dados, desenhada pelo próprio `cell` - o
 * card sem ele começava por um "..." solto.
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
    <div data-slot="table-mobile-cards" className="flex flex-col gap-3 p-1">
      {rows.map((row, index) => {
        const cells = row.getVisibleCells()
        const controls = cells.filter((cell) => !cell.column.accessorFn)
        const valueCells = cells.filter((cell) => cell.column.accessorFn)
        let title = valueCells.find(
          (cell) => cell.column.columnDef.meta?.primary,
        )
        if (!title) title = valueCells.at(0)
        const values = valueCells.filter((cell) => cell !== title)

        let state: 'selected' | undefined = undefined
        if (row.getIsSelected()) state = 'selected'

        return (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- atalho de mouse: o menu da linha dá a mesma ação ao teclado
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
              {title && (
                <div
                  data-slot="table-mobile-card-title"
                  className="min-w-0 flex-1 font-medium"
                >
                  <FlexRender cell={title} />
                </div>
              )}
              {controls.length > 0 && (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- só contém o clique: o teclado não atravessa a borda
                <div
                  className="flex shrink-0 flex-wrap items-center justify-end gap-2"
                  // Clicar na caixa de seleção ou no menu não deve também abrir
                  // o registro.
                  onClick={(event) => event.stopPropagation()}
                >
                  {controls.map((cell) => (
                    <div key={cell.id}>
                      <FlexRender cell={cell} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <dl className="flex flex-col gap-1.5">
              {values.map((cell) => (
                <div
                  key={cell.id}
                  className="flex items-start justify-between gap-3"
                >
                  <dt className="max-w-label shrink-0 truncate text-xs font-medium text-muted-foreground">
                    {labels.get(cell.column.id) ?? cell.column.id}
                  </dt>
                  <dd className="min-w-0 text-right text-sm break-words">
                    <FlexRender cell={cell} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}
    </div>
  )
}
