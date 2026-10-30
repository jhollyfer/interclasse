import type { PaginationMeta } from '@interclasse/shared'
import type * as React from 'react'

import { PageShellFooter } from '#/components/common/page-shell'

import { useTableContext } from './table-context'
import { Pagination } from './table-pagination-nav'

/**
 * O rodapé fixo com a paginação.
 *
 * `meta` vem por prop, e não do contexto, porque é a resposta da consulta e não
 * estado da tabela: enquanto a primeira página não chega ela não existe, e o
 * rodapé simplesmente não aparece.
 */
export function TablePagination({
  meta,
}: Readonly<{
  meta: PaginationMeta | undefined
}>): React.JSX.Element | null {
  const { to, search } = useTableContext('TablePagination')

  if (!meta) return null

  return (
    <PageShellFooter data-slot="table-pagination">
      <Pagination meta={meta} search={search} to={to} />
    </PageShellFooter>
  )
}
