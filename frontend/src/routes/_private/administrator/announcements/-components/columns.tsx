import type { AdministratorAnnouncementShowResponse } from '@interclasse/shared'

import { TableColumnHeader } from '#/components/common/table'
import type { TableColumns } from '#/components/common/table'
import { Badge } from '#/components/ui/badge'
import { formatDate } from '#/lib/labels'
import { m } from '#/paraglide/messages'

export function announcementColumns(): TableColumns<AdministratorAnnouncementShowResponse> {
  return [
    {
      accessorKey: 'title',
      meta: { label: m.admin_common_title() },
      size: 320,
      header: ({ column }) => (
        <TableColumnHeader sortKey="title" column={column}>
          {m.admin_common_title()}
        </TableColumnHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{row.original.title}</span>
          {row.original.pinned && (
            <Badge variant="info">{m.admin_announcements_pinned()}</Badge>
          )}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'createdAt',
      meta: { label: m.admin_announcements_published_on() },
      size: 170,
      header: ({ column }) => (
        <TableColumnHeader sortKey="createdAt" column={column}>
          {m.admin_announcements_published_on()}
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
