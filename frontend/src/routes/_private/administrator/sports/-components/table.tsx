import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  Table,
  TableActions,
  TableColumnToggle,
  TableContent,
  TableCreateButton,
  TableEmpty,
  TableEmptyActions,
  TableEmptyDescription,
  TableEmptyTitle,
  TableGrid,
  TableHeader,
  TablePagination,
  TableSearch,
  TableTitle,
  TableToolbar,
  useTable,
} from '#/components/common/table'
import { sportsQueryOptions } from '#/integrations/tanstack-query/queries'

import { sportColumns } from './columns'
import { SportRowActions } from './row-actions'

const route = getRouteApi('/_private/administrator/sports/')

export function SportsTable(): React.JSX.Element {
  const search = route.useSearch()
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    sportsQueryOptions(search),
  )

  const table = useTable({
    rows: data?.data ?? [],
    columns: sportColumns,
    getRowId: (row) => row.id,
    persistKey: 'administrator:sports',
    actions: (sport) => <SportRowActions sport={sport} />,
  })

  return (
    <Table
      to="/administrator/sports"
      search={search}
      isPlaceholderData={isPlaceholderData}
      isError={isError}
      onRetry={() => void refetch()}
    >
      <TableHeader>
        <TableTitle>Modalidades</TableTitle>
        <TableActions>
          <TableCreateButton to="/administrator/sports/new">
            Adicionar modalidade
          </TableCreateButton>
        </TableActions>
      </TableHeader>

      <TableToolbar>
        <TableSearch placeholder="Buscar modalidades..." />
        <TableColumnToggle table={table} />
      </TableToolbar>

      <TableContent>
        <TableEmpty table={table}>
          <TableEmptyTitle>Nenhuma modalidade ainda</TableEmptyTitle>
          <TableEmptyDescription>
            Futsal, vôlei, queimada... cada uma com o mínimo e o máximo de
            atletas por time.
          </TableEmptyDescription>
          <TableEmptyActions>
            <TableCreateButton to="/administrator/sports/new">
              Adicionar modalidade
            </TableCreateButton>
          </TableEmptyActions>
        </TableEmpty>

        <TableGrid table={table} />
      </TableContent>

      <TablePagination meta={data?.meta} />
    </Table>
  )
}
