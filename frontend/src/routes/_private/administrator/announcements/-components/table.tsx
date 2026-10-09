import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { announcementColumns } from './columns'
import { AnnouncementRowActions } from './row-actions'
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
import { announcementsQueryOptions } from '#/integrations/tanstack-query/queries'

const route = getRouteApi('/_private/administrator/announcements/')

export function AnnouncementsTable(): React.JSX.Element {
  const search = route.useSearch()
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    announcementsQueryOptions(search),
  )

  const table = useTable({
    rows: data?.data ?? [],
    columns: announcementColumns,
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
        <TableTitle>Avisos</TableTitle>
        <TableActions>
          <TableCreateButton to="/administrator/announcements/new">
            Adicionar aviso
          </TableCreateButton>
        </TableActions>
      </TableHeader>

      <TableToolbar>
        <TableSearch placeholder="Buscar avisos..." />
        <TableColumnToggle table={table} />
      </TableToolbar>

      <TableContent>
        <TableEmpty table={table}>
          <TableEmptyTitle>Nenhum aviso ainda</TableEmptyTitle>
          <TableEmptyDescription>
            Troca de horário, local, regra: o aviso aparece no site assim que é
            criado.
          </TableEmptyDescription>
          <TableEmptyActions>
            <TableCreateButton to="/administrator/announcements/new">
              Adicionar aviso
            </TableCreateButton>
          </TableEmptyActions>
        </TableEmpty>

        <TableGrid table={table} />
      </TableContent>

      <TablePagination meta={data?.meta} />
    </Table>
  )
}
