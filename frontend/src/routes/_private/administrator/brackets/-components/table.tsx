import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { bracketColumns } from './columns'
import { DrawDialog } from './draw-dialog'
import {
  Table,
  TableActions,
  TableContent,
  TableEmpty,
  TableEmptyActions,
  TableEmptyDescription,
  TableEmptyTitle,
  TableGrid,
  TableHeader,
  TablePagination,
  TableTitle,
  useTable,
} from '#/components/common/table'
import { bracketsQueryOptions } from '#/integrations/tanstack-query/queries'

const route = getRouteApi('/_private/administrator/brackets/')

export function BracketsTable(): React.JSX.Element {
  const search = route.useSearch()
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    bracketsQueryOptions(search),
  )

  const table = useTable({
    rows: data?.data ?? [],
    columns: bracketColumns,
    getRowId: (row) => row.id,
    persistKey: 'administrator:brackets',
  })

  return (
    <Table
      to="/administrator/brackets"
      search={search}
      isPlaceholderData={isPlaceholderData}
      isError={isError}
      onRetry={() => void refetch()}
    >
      <TableHeader>
        <TableTitle>Chaves</TableTitle>
        <TableActions>
          <DrawDialog />
        </TableActions>
      </TableHeader>

      <TableContent>
        <TableEmpty table={table}>
          <TableEmptyTitle>Nenhuma chave sorteada</TableEmptyTitle>
          <TableEmptyDescription>
            Cadastre turmas e modalidades, deixe as turmas inscreverem os
            atletas e sorteie a chave de cada modalidade por categoria.
          </TableEmptyDescription>
          <TableEmptyActions>
            <DrawDialog />
          </TableEmptyActions>
        </TableEmpty>

        <TableGrid table={table} />
      </TableContent>

      <TablePagination meta={data?.meta} />
    </Table>
  )
}
