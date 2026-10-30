import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import * as React from 'react'

import {
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
} from '#/components/common/empty-state'
import {
  Table,
  TableActions,
  TableColumnToggle,
  TableContent,
  TableCreateButton,
  TableEmpty,
  TableGrid,
  TableHeader,
  TablePagination,
  TableSearch,
  TableTitle,
  TableToolbar,
  useTable,
} from '#/components/common/table'
import { sportsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { m } from '#/paraglide/messages'

import { sportColumns } from './columns'
import { SportRowActions } from './row-actions'

const route = getRouteApi('/_private/administrator/sports/')

export function SportsTable(): React.JSX.Element {
  const search = route.useSearch()
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    sportsQueryOptions(search),
  )

  const columns = React.useMemo(() => sportColumns(), [])

  const table = useTable({
    rows: data?.data ?? [],
    columns,
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
        <TableTitle>{m.admin_sports_title()}</TableTitle>
        <TableActions>
          <TableCreateButton to="/administrator/sports/new">
            {m.admin_sports_create()}
          </TableCreateButton>
        </TableActions>
      </TableHeader>

      <TableToolbar>
        <TableSearch placeholder={m.admin_sports_search()} />
        <TableColumnToggle table={table} />
      </TableToolbar>

      <TableContent>
        <TableEmpty table={table}>
          <EmptyStateTitle>{m.admin_sports_empty_title()}</EmptyStateTitle>
          <EmptyStateDescription>
            {m.admin_sports_empty_description()}
          </EmptyStateDescription>
          <EmptyStateActions>
            <TableCreateButton to="/administrator/sports/new">
              {m.admin_sports_create()}
            </TableCreateButton>
          </EmptyStateActions>
        </TableEmpty>

        <TableGrid table={table} />
      </TableContent>

      <TablePagination meta={data?.meta} />
    </Table>
  )
}
