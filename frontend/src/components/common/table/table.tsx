import * as React from 'react'

import { TableProvider } from './table-context'

import { PageShell } from '#/components/common/page-shell'
import type { ListSearch } from '#/lib/list-search'
import type { Merge } from '#/lib/interfaces'

type TableProps = Merge<
  React.ComponentProps<typeof PageShell>,
  {
    /** A rota desta listagem, para busca, ordenação e paginação. */
    to: string
    search: ListSearch
    /** A consulta está servindo a página anterior enquanto refaz a nova. */
    isPlaceholderData?: boolean
    /** A consulta falhou. Troca a área de conteúdo pelo estado de erro. */
    isError?: boolean
    /** Refaz a consulta, no botão do estado de erro. */
    onRetry?: () => void
  }
>

/**
 * A raiz de uma listagem do painel: guarda a rota e os filtros, e desenha a
 * casca com cabeçalho fixo, conteúdo que rola e rodapé fixo.
 *
 * O consumidor monta as partes na ordem que quiser - `TableHeader`,
 * `TableToolbar`, `TableContent`, `TablePagination` - e nenhuma delas recebe
 * `to` nem `search`: todas leem daqui.
 *
 * A instância da tabela **não** passa por este contexto; ela vai por prop nos
 * três subcomponentes que a leem, pelo motivo escrito em `table-context.ts`.
 */
export function Table({
  to,
  search,
  isPlaceholderData = false,
  isError = false,
  onRetry,
  children,
  ...rest
}: TableProps): React.JSX.Element {
  // Sem `useMemo` o objeto é novo a cada render da rota e todo subcomponente
  // re-renderiza junto, mesmo com a rota e os filtros iguais.
  const value = React.useMemo(
    () => ({ to, search, isPlaceholderData, isError, onRetry }),
    [to, search, isPlaceholderData, isError, onRetry],
  )

  return (
    <TableProvider value={value}>
      <PageShell {...rest}>{children}</PageShell>
    </TableProvider>
  )
}
