import { Link } from '@tanstack/react-router'
import type { AdministratorBracketPaginateResponse } from '@interclasse/shared'

import { Badge } from '#/components/ui/badge'
import type { TableColumns } from '#/components/common/table'
import {
  BRACKET_STATUS_LABELS,
  BRACKET_STATUS_VARIANTS,
  CATEGORY_LABELS,
  formatDate,
} from '#/lib/labels'
import { m } from '#/paraglide/messages'

/** Sem `sortKey`: a listagem de chaves não aceita `?sort`. */
export function bracketColumns(): TableColumns<AdministratorBracketPaginateResponse> {
  return [
    {
      id: 'sport',
      accessorFn: (row) => row.sport.name,
      meta: { label: m.admin_common_sport() },
      size: 220,
      header: () => m.admin_common_sport(),
      cell: ({ row }) => (
        <Link
          to="/administrator/brackets/$id"
          params={{ id: row.original.id }}
          className="font-medium hover:underline"
        >
          {row.original.sport.name}
        </Link>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'category',
      meta: { label: m.admin_common_category() },
      size: 160,
      header: () => m.admin_common_category(),
      cell: ({ row }) =>
        CATEGORY_LABELS[row.original.category] ?? row.original.category,
    },
    {
      accessorKey: 'status',
      meta: { label: m.admin_common_status() },
      size: 160,
      header: () => m.admin_common_status(),
      cell: ({ row }) => (
        <Badge variant={BRACKET_STATUS_VARIANTS[row.original.status]}>
          {BRACKET_STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      meta: { label: m.admin_brackets_drawn_on() },
      size: 160,
      header: () => m.admin_brackets_drawn_on(),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
  ]
}
