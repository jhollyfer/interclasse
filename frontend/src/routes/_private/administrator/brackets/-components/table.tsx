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
  TableContent,
  TableEmpty,
  TableGrid,
  TableHeader,
  TablePagination,
  TableTitle,
  useTable,
} from '#/components/common/table'
import { bracketsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { m } from '#/paraglide/messages'

import { bracketColumns } from './columns'
import { DrawDialog } from './draw-dialog'
import { BracketRowActions } from './row-actions'

const route = getRouteApi('/_private/administrator/brackets/')

export function BracketsTable(): React.JSX.Element {
  const search = route.useSearch()
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    bracketsQueryOptions(search),
  )

  const columns = React.useMemo(() => bracketColumns(), [])

  const table = useTable({
    rows: data?.data ?? [],
    columns,
    getRowId: (row) => row.id,
    actions: (bracket) => <BracketRowActions bracket={bracket} />,
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
        <TableTitle>{m.admin_common_brackets()}</TableTitle>
        <TableActions>
          <DrawDialog />
        </TableActions>
      </TableHeader>

      <TableContent>
        <TableEmpty table={table}>
          <EmptyStateTitle>{m.admin_brackets_empty_title()}</EmptyStateTitle>
          <EmptyStateDescription>
            {m.admin_brackets_empty_description()}
          </EmptyStateDescription>
          <EmptyStateActions>
            <DrawDialog />
          </EmptyStateActions>
        </TableEmpty>

        <TableGrid table={table} />
      </TableContent>

      <TablePagination meta={data?.meta} />
    </Table>
  )
}
