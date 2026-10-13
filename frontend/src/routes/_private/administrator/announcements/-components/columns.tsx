import { Badge } from '#/components/ui/badge'
import { TableColumnHeader } from '#/components/common/table'
import type { TableColumns } from '#/components/common/table'
import { formatDate } from '#/lib/labels'
import type { IAnnouncement } from '#/lib/interfaces'

export const announcementColumns: TableColumns<IAnnouncement> = [
  {
    accessorKey: 'title',
    meta: { label: 'Título' },
    size: 320,
    header: ({ column }) => (
      <TableColumnHeader sortKey="title" column={column}>
        Título
      </TableColumnHeader>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="truncate font-medium">{row.original.title}</span>
        {row.original.pinned && <Badge variant="info">Fixado</Badge>}
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: 'createdAt',
    meta: { label: 'Publicado em' },
    size: 170,
    header: ({ column }) => (
      <TableColumnHeader sortKey="createdAt" column={column}>
        Publicado em
      </TableColumnHeader>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
]
