import type { AdministratorSportShowResponse } from '@interclasse/shared'

import { TableColumnHeader } from '#/components/common/table'
import type { TableColumns } from '#/components/common/table'
import { m } from '#/paraglide/messages'

export function sportColumns(): TableColumns<AdministratorSportShowResponse> {
  return [
    {
      accessorKey: 'name',
      meta: { label: m.admin_common_sport() },
      size: 220,
      header: ({ column }) => (
        <TableColumnHeader sortKey="name" column={column}>
          {m.admin_common_sport()}
        </TableColumnHeader>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
      enableHiding: false,
    },
    {
      id: 'athletes',
      accessorFn: (row) => `${row.minAthletes}-${row.maxAthletes}`,
      meta: { label: m.admin_sports_athletes_per_team() },
      size: 180,
      header: () => m.admin_sports_athletes_per_team(),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {m.admin_sports_range({
            min: row.original.minAthletes,
            max: row.original.maxAthletes,
          })}
        </span>
      ),
    },
  ]
}
