import { TRASHED_MODE } from '@interclasse/shared'
import { useNavigate } from '@tanstack/react-router'
import type { RowData } from '@tanstack/react-table'
import type * as React from 'react'

import { EmptyState } from '#/components/common/empty-state'
import type { EmptyStateReason } from '#/components/common/empty-state'
import { Button } from '#/components/ui/button'
import { EmptyContent } from '#/components/ui/empty'
import { m } from '#/paraglide/messages'

import { useTableContext } from './table-context'
import type { TableInstance } from './use-table'

type TableEmptyProps<TRow extends RowData> = Readonly<{
  table: TableInstance<TRow>
  /** O texto e a ação do vazio de verdade - o filtro e a lixeira têm os seus. */
  children?: React.ReactNode
}>

/**
 * O que aparece no lugar da tabela quando não há linha nenhuma: o
 * `EmptyState` do kit, com o motivo lido do `search` da URL.
 *
 * Decide sozinho se renderiza, lendo a contagem de linhas da instância - uma
 * prop `isEmpty` seria segunda fonte de verdade ao lado da tabela.
 */
export function TableEmpty<TRow extends RowData>({
  table,
  children,
}: TableEmptyProps<TRow>): React.JSX.Element | null {
  const { to, search } = useTableContext('TableEmpty')
  const navigate = useNavigate()

  // O filtro vence a lixeira: buscar dentro dela e não achar nada é problema do
  // termo, não da lixeira estar vazia.
  let reason: EmptyStateReason = 'empty'
  if (search.trashed === TRASHED_MODE.ONLY) reason = 'trash'
  if (search.search) reason = 'filtered'

  if (table.getRowModel().rows.length > 0) return null

  return (
    <EmptyState reason={reason}>
      {children}

      {reason === 'filtered' && (
        <EmptyContent className="mt-3">
          <Button
            variant="outline"
            onClick={() =>
              void navigate({
                to,
                search: { ...search, search: undefined, page: undefined },
              })
            }
          >
            {m.table_empty_filtered_action()}
          </Button>
        </EmptyContent>
      )}
    </EmptyState>
  )
}
