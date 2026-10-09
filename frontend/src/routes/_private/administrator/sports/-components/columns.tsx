import { TableColumnHeader } from '#/components/common/table'
import type { TableColumns } from '#/components/common/table'
import type { Sport } from '#/lib/validator'

export const sportColumns: TableColumns<Sport> = [
  {
    accessorKey: 'name',
    meta: { label: 'Modalidade' },
    size: 220,
    header: ({ column }) => (
      <TableColumnHeader sortKey="name" column={column}>
        Modalidade
      </TableColumnHeader>
    ),
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    enableHiding: false,
  },
  {
    id: 'athletes',
    accessorFn: (row) => `${row.minAthletes}-${row.maxAthletes}`,
    meta: { label: 'Atletas por time' },
    size: 180,
    header: () => 'Atletas por time',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.minAthletes} a {row.original.maxAthletes}
      </span>
    ),
  },
]
