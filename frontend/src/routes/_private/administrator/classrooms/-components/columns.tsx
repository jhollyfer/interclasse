import { Badge } from '#/components/ui/badge'
import { TableColumnHeader } from '#/components/common/table'
import type { TableColumns } from '#/components/common/table'
import { CATEGORY_LABELS } from '#/lib/labels'
import type { Classroom } from '#/lib/validator'

/** `sortKey` só onde o backend ordena: `CLASSROOM_SORT_COLUMNS`. */
export const classroomColumns: TableColumns<Classroom> = [
  {
    accessorKey: 'name',
    meta: { label: 'Turma' },
    size: 140,
    header: ({ column }) => (
      <TableColumnHeader sortKey="name" column={column}>
        Turma
      </TableColumnHeader>
    ),
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    enableHiding: false,
  },
  {
    accessorKey: 'category',
    meta: { label: 'Categoria' },
    size: 160,
    header: ({ column }) => (
      <TableColumnHeader sortKey="category" column={column}>
        Categoria
      </TableColumnHeader>
    ),
    cell: ({ row }) => (
      <Badge variant="neutral">
        {CATEGORY_LABELS[row.original.category] ?? row.original.category}
      </Badge>
    ),
  },
  {
    id: 'advisor',
    accessorFn: (row) => row.advisor?.name ?? '',
    meta: { label: 'Conselheiro' },
    size: 220,
    header: () => 'Conselheiro',
    cell: ({ row }) => (
      <span className="text-muted-foreground block truncate">
        {row.original.advisor?.name ?? '-'}
      </span>
    ),
  },
  {
    id: 'representative',
    accessorFn: (row) => row.representative?.name ?? '',
    meta: { label: 'Representante' },
    size: 220,
    header: () => 'Representante',
    cell: ({ row }) => (
      <span className="text-muted-foreground block truncate">
        {row.original.representative?.name ?? '-'}
      </span>
    ),
  },
]
