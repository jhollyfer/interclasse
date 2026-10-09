import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { classroomColumns } from './columns'
import { ClassroomFilters } from './filters'
import { ClassroomRowActions } from './row-actions'
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
import { classroomsQueryOptions } from '#/integrations/tanstack-query/queries'

const route = getRouteApi('/_private/administrator/classrooms/')

export function ClassroomsTable(): React.JSX.Element {
  const search = route.useSearch()
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    classroomsQueryOptions(search),
  )

  const table = useTable({
    rows: data?.data ?? [],
    columns: classroomColumns,
    getRowId: (row) => row.id,
    persistKey: 'administrator:classrooms',
    actions: (classroom) => <ClassroomRowActions classroom={classroom} />,
  })

  return (
    <Table
      to="/administrator/classrooms"
      search={search}
      isPlaceholderData={isPlaceholderData}
      isError={isError}
      onRetry={() => void refetch()}
    >
      <TableHeader>
        <TableTitle>Turmas</TableTitle>
        <TableActions>
          <TableCreateButton to="/administrator/classrooms/new">
            Adicionar turma
          </TableCreateButton>
        </TableActions>
      </TableHeader>

      <TableToolbar>
        <TableSearch placeholder="Buscar turmas..." />
        <ClassroomFilters search={search} />
        <TableColumnToggle table={table} />
      </TableToolbar>

      <TableContent>
        <TableEmpty table={table}>
          <TableEmptyTitle>Nenhuma turma ainda</TableEmptyTitle>
          <TableEmptyDescription>
            Cada turma forma um time por modalidade. A categoria sai do ano.
          </TableEmptyDescription>
          <TableEmptyActions>
            <TableCreateButton to="/administrator/classrooms/new">
              Adicionar turma
            </TableCreateButton>
          </TableEmptyActions>
        </TableEmpty>

        <TableGrid table={table} />
      </TableContent>

      <TablePagination meta={data?.meta} />
    </Table>
  )
}
