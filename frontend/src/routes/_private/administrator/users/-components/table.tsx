import { getRouteApi } from '@tanstack/react-router'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { USER_ROLE } from '@interclasse/shared'

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

  // `/administrator/users` inteiro é de `ADMINISTRATOR`: quem chega aqui sem o
  // papel recebe `403` da própria listagem. A checagem fica porque o papel
  // pode mudar debaixo da sessão aberta; quem autoriza de verdade é o backend.
  const canDelete = account.role === USER_ROLE.ADMINISTRATOR

  // `useQuery` e não `useSuspenseQuery`: a listagem precisa de
  // `isPlaceholderData` e de `isError` para manter as linhas antigas na troca
  // de página e para trocar o vazio pelo estado de erro. O `loader` já encheu o
  // cache, então não há requisição a mais.
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    usersQueryOptions(search),
  )

  const columns = React.useMemo(() => userColumns(), [])

  const table = useTable({
    rows: data?.data ?? [],
    columns,
    getRowId: (row) => row.id,
    persistKey: 'administrator:users',
    // A própria conta não entra na seleção: arquivá-la é
    // `403 SELF_ARCHIVE_FORBIDDEN`, e a barra não deve oferecer o que a API
    // nega. O id vem do contexto da rota, que é quem tem a conta autenticada.
    selectable: (user) => user.id !== account.id,
    actions: (user) => (
      <UserRowActions
        user={user}
        canDelete={canDelete}
        // Arquivar e apagar a própria conta é `403 SELF_ARCHIVE_FORBIDDEN` e
        // `403 SELF_DELETE_FORBIDDEN`. O id vem do contexto da rota, que é
        // quem já tem a conta autenticada.
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
