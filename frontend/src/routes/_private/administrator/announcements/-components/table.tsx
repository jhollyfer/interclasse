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
import { announcementsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { m } from '#/paraglide/messages'

import { announcementColumns } from './columns'
import { AnnouncementRowActions } from './row-actions'

const route = getRouteApi('/_private/administrator/announcements/')

export function AnnouncementsTable(): React.JSX.Element {
  const search = route.useSearch()
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    announcementsQueryOptions(search),
  )

  const columns = React.useMemo(() => announcementColumns(), [])

  const table = useTable({
    rows: data?.data ?? [],
    columns,
    getRowId: (row) => row.id,
    persistKey: 'administrator:announcements',
    actions: (announcement) => (
      <AnnouncementRowActions announcement={announcement} />
    ),
  })

  return (
    <Table
      to="/administrator/announcements"
      search={search}
      isPlaceholderData={isPlaceholderData}
      isError={isError}
      onRetry={() => void refetch()}
    >
      <TableHeader>
        <TableTitle>{m.admin_announcements_title()}</TableTitle>
        <TableActions>
          <TableCreateButton to="/administrator/announcements/new">
            {m.admin_announcements_create()}
          </TableCreateButton>
        </TableActions>
      </TableHeader>

      <TableToolbar>
        <TableSearch placeholder={m.admin_announcements_search()} />
        <TableColumnToggle table={table} />
      </TableToolbar>

      <TableContent>
        <TableEmpty table={table}>
          <TableEmptyTitle>
            {m.admin_announcements_empty_title()}
          </TableEmptyTitle>
          <TableEmptyDescription>
            {m.admin_announcements_empty_description()}
          </TableEmptyDescription>
          <TableEmptyActions>
            <TableCreateButton to="/administrator/announcements/new">
              {m.admin_announcements_create()}
            </TableCreateButton>
          </TableEmptyActions>
        </TableEmpty>

        <TableGrid table={table} />
      </TableContent>

      <TablePagination meta={data?.meta} />
    </Table>
  )
}
