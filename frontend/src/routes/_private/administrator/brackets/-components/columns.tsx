import { Link } from '@tanstack/react-router'

import { Badge } from '#/components/ui/badge'
import type { TableColumns } from '#/components/common/table'
import {
  BRACKET_STATUS_LABELS,
  BRACKET_STATUS_VARIANTS,
  CATEGORY_LABELS,
  formatDate,
} from '#/lib/labels'
import type { Bracket } from '#/lib/validator'

/** Sem `sortKey`: a listagem de chaves não aceita `?sort`. */
export const bracketColumns: TableColumns<Bracket> = [
  {
    id: 'sport',
    accessorFn: (row) => row.sport?.name ?? '',
    meta: { label: 'Modalidade' },
    size: 220,
    header: () => 'Modalidade',
    cell: ({ row }) => (
      <Link
        to="/administrator/brackets/$id"
        params={{ id: row.original.id }}
        className="font-medium hover:underline"
      >
        {row.original.sport?.name}
      </Link>
    ),
    enableHiding: false,
  },
  {
    accessorKey: 'category',
    meta: { label: 'Categoria' },
    size: 160,
    header: () => 'Categoria',
    cell: ({ row }) =>
      CATEGORY_LABELS[row.original.category] ?? row.original.category,
  },
  {
    accessorKey: 'status',
    meta: { label: 'Situação' },
    size: 160,
    header: () => 'Situação',
    cell: ({ row }) => (
      <Badge variant={BRACKET_STATUS_VARIANTS[row.original.status]}>
        {BRACKET_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    meta: { label: 'Sorteada em' },
    size: 160,
    header: () => 'Sorteada em',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
]
