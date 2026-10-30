import { getRouteApi } from '@tanstack/react-router'
import * as React from 'react'
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
          <TableEmptyTitle>{m.admin_sports_empty_title()}</TableEmptyTitle>
          <TableEmptyDescription>
            {m.admin_sports_empty_description()}
          </TableEmptyDescription>
          <TableEmptyActions>
            <TableCreateButton to="/administrator/sports/new">
              {m.admin_sports_create()}
            </TableCreateButton>
          </TableEmptyActions>
        </TableEmpty>

        <TableGrid table={table} />
      </TableContent>

      <TablePagination meta={data?.meta} />
    </Table>
  )
}
