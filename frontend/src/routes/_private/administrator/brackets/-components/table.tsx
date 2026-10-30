import { getRouteApi } from '@tanstack/react-router'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

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
          <TableEmptyTitle>{m.admin_brackets_empty_title()}</TableEmptyTitle>
          <TableEmptyDescription>
            {m.admin_brackets_empty_description()}
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
