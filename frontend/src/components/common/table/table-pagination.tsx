import type * as React from 'react'

import { useTableContext } from './table-context'
import { Pagination } from './table-pagination-nav'

import { PageShellFooter } from '#/components/common/page-shell'
import type { PaginationMeta } from '#/integrations/response'

/**
 * O rodapé fixo com a paginação.
 *
 * `meta` vem por prop, e não do contexto, porque é a resposta da consulta e não
 * estado da tabela: enquanto a primeira página não chega ela não existe, e o
 * rodapé simplesmente não aparece.
 */
export function TablePagination({
  meta,
}: {
  meta: PaginationMeta | undefined
}): React.JSX.Element | null {
  const { to, search } = useTableContext('TablePagination')

  if (!meta) return null

  return (
    <PageShellFooter>
      <Pagination meta={meta} search={search} to={to} />
    </PageShellFooter>
  )
}
