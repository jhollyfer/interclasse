import type { AdministratorUserShowResponse } from '@interclasse/shared'

import { TableColumnHeader } from '#/components/common/table'
import type { TableColumns } from '#/components/common/table'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_VARIANTS,
  USER_ROLE_LABELS,
  USER_ROLE_VARIANTS,
  formatDate,
  initials,
} from '#/lib/labels'
import { m } from '#/paraglide/messages'

/**
 * `meta.label` is the plain-text label, for the visible-columns menu:
 * `header` became a component, and `String(element)` prints `[object Object]`.
 *
 * `sortKey` only exists where the backend sorts - `USER_SORT_COLUMNS` is `name`,
 * `email`, `role`, `status` and `createdAt`. Any other column offering sorting
 * would become a `422` on the first click on the header.
 */
export function userColumns(): TableColumns<AdministratorUserShowResponse> {
  return [
    {
      accessorKey: 'name',
      meta: { label: m.admin_users_user() },
      size: 250,
      header: ({ column }) => (
        <TableColumnHeader sortKey="name" column={column}>
          {m.admin_users_user()}
        </TableColumnHeader>
      ),
      // The photo goes with the name in the same cell: a column just for the avatar
      // would make the table wider without saying anything more, and `?sort=avatarId`
      // does not exist on the backend.
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarImage src={row.original.avatar?.url} alt="" />
            <AvatarFallback className="bg-brand text-brand-ink text-xs font-semibold">
              {initials(row.original.name)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate leading-none font-medium">
            {row.original.name}
          </span>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'email',
      meta: { label: m.admin_common_email() },
      size: 270,
      header: ({ column }) => (
        <TableColumnHeader sortKey="email" column={column}>
          {m.admin_common_email()}
        </TableColumnHeader>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground block truncate">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'role',
      meta: { label: m.admin_common_role() },
      size: 150,
      header: ({ column }) => (
        <TableColumnHeader sortKey="role" column={column}>
          {m.admin_common_role()}
        </TableColumnHeader>
      ),
      // The `??` covers a new backend role arriving here before this screen
      // knows about it: better to print the raw role than an empty cell.
      cell: ({ row }) => (
        <Badge variant={USER_ROLE_VARIANTS[row.original.role]}>
          {USER_ROLE_LABELS[row.original.role] ?? row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      meta: { label: m.admin_common_status() },
      size: 150,
      header: ({ column }) => (
        <TableColumnHeader sortKey="status" column={column}>
          {m.admin_common_status()}
        </TableColumnHeader>
      ),
      // `ACCOUNT_STATUS_LABELS` and not `ACTIVE_STATUS_LABELS`: this screen's subject
      // is people, and the agreement is "Ativo", not "Ativa". The color is the same
      // as the enum's, which does not change with the subject.
      cell: ({ row }) => (
        <Badge variant={ACTIVE_STATUS_VARIANTS[row.original.status]}>
          {ACCOUNT_STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      meta: { label: m.admin_common_created_on() },
      size: 160,
      header: ({ column }) => (
        <TableColumnHeader sortKey="createdAt" column={column}>
          {m.admin_common_created_on()}
        </TableColumnHeader>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
  ]
}
