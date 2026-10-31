import { USER_ROLE } from '@interclasse/shared'
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
  TableSelectionBar,
  TableTitle,
  TableToolbar,
  TableTrashToggle,
  useTable,
} from '#/components/common/table'
import { usersQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { m } from '#/paraglide/messages'

import { UserBulkActions } from './bulk-actions'
import { userColumns } from './columns'
import { UserFilters } from './filters'
import { UserRowActions } from './row-actions'

const route = getRouteApi('/_private/administrator/users/')

export function UsersTable(): React.JSX.Element {
  const { account } = route.useRouteContext()
  const search = route.useSearch()

  // The whole `/administrator/users` belongs to `ADMINISTRATOR`: whoever gets here without the
  // role receives `403` from the listing itself. The check stays because the role
  // can change under the open session; whoever really authorizes is the backend.
  const canDelete = account.role === USER_ROLE.ADMINISTRATOR

  // `useQuery` and not `useSuspenseQuery`: the listing needs
  // `isPlaceholderData` and `isError` to keep the old rows when changing
  // page and to swap the empty state for the error state. The `loader` already filled the
  // cache, so there is no extra request.
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    usersQueryOptions(search),
  )

  const columns = userColumns()

  const table = useTable({
    rows: data?.data ?? [],
    columns,
    getRowId: (row) => row.id,
    persistKey: 'administrator:users',
    // The account itself does not enter the selection: archiving it is
    // `403 SELF_ARCHIVE_FORBIDDEN`, and the bar must not offer what the API
    // denies. The id comes from the route context, which is who has the authenticated account.
    selectable: (user) => user.id !== account.id,
    actions: (user) => (
      <UserRowActions
        user={user}
        canDelete={canDelete}
        // Archiving and deleting one's own account is `403 SELF_ARCHIVE_FORBIDDEN` and
        // `403 SELF_DELETE_FORBIDDEN`. The id comes from the route context, which is
        // who already has the authenticated account.
        isSelf={user.id === account.id}
      />
    ),
  })

  return (
    <Table
      to="/administrator/users"
      search={search}
      isPlaceholderData={isPlaceholderData}
      isError={isError}
      onRetry={() => void refetch()}
    >
      <TableHeader>
        <TableTitle>{m.admin_users_title()}</TableTitle>
        <TableActions>
          <TableCreateButton to="/administrator/users/new">
            {m.admin_users_create()}
          </TableCreateButton>
        </TableActions>
      </TableHeader>

      <TableToolbar>
        <TableSearch placeholder={m.admin_users_search()} />
        <UserFilters search={search} />
        <TableTrashToggle />
        <TableColumnToggle table={table} />
      </TableToolbar>

      <TableContent>
        <TableEmpty table={table}>
          <EmptyStateTitle>{m.admin_users_empty_title()}</EmptyStateTitle>
          <EmptyStateDescription>
            {m.admin_users_empty_description()}
          </EmptyStateDescription>
          <EmptyStateActions>
            <TableCreateButton to="/administrator/users/new">
              {m.admin_users_create()}
            </TableCreateButton>
          </EmptyStateActions>
        </TableEmpty>

        <TableGrid table={table} />

        <TableSelectionBar
          table={table}
          noun={[m.admin_users_noun_one(), m.admin_users_noun_other()]}
        >
          {(users) => <UserBulkActions users={users} />}
        </TableSelectionBar>
      </TableContent>

      <TablePagination meta={data?.meta} />
    </Table>
  )
}
