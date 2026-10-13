import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { TableColumnHeader } from '#/components/common/table'
import type { TableColumns } from '#/components/common/table'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_VARIANTS,
  USER_ROLE_LABELS,
  USER_ROLE_VARIANTS,
  formatDate,
  initials,
} from '#/lib/labels'
import type { IUser } from '#/lib/interfaces'

/**
 * `meta.label` é o rótulo em texto puro, para o menu de colunas visíveis:
 * `header` virou componente, e `String(elemento)` imprime `[object Object]`.
 *
 * `sortKey` só existe onde o backend ordena - `USER_SORT_COLUMNS` é `name`,
 * `email`, `role`, `status` e `createdAt`. Qualquer outra coluna oferecendo a
 * ordem viraria `422` ao primeiro clique no cabeçalho.
 */
export const userColumns: TableColumns<IUser> = [
  {
    accessorKey: 'name',
    meta: { label: 'Usuário' },
    size: 250,
    header: ({ column }) => (
      <TableColumnHeader sortKey="name" column={column}>
        Usuário
      </TableColumnHeader>
    ),
    // A foto acompanha o nome na mesma célula: uma coluna só para o avatar
    // deixaria a tabela mais larga sem dizer nada a mais, e `?sort=avatarId`
    // não existe no backend.
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
    meta: { label: 'E-mail' },
    size: 270,
    header: ({ column }) => (
      <TableColumnHeader sortKey="email" column={column}>
        E-mail
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
    meta: { label: 'Papel' },
    size: 150,
    header: ({ column }) => (
      <TableColumnHeader sortKey="role" column={column}>
        Papel
      </TableColumnHeader>
    ),
    // O `??` cobre um papel novo do backend chegando aqui antes de esta tela
    // saber dele: melhor imprimir o papel cru do que uma célula vazia.
    cell: ({ row }) => (
      <Badge variant={USER_ROLE_VARIANTS[row.original.role]}>
        {USER_ROLE_LABELS[row.original.role] ?? row.original.role}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    meta: { label: 'Situação' },
    size: 150,
    header: ({ column }) => (
      <TableColumnHeader sortKey="status" column={column}>
        Situação
      </TableColumnHeader>
    ),
    // `ACCOUNT_STATUS_LABELS` e não `ACTIVE_STATUS_LABELS`: o sujeito desta
    // tela é gente, e a concordância é "Ativo", não "Ativa". A cor é a mesma do
    // enum, que não muda com o sujeito.
    cell: ({ row }) => (
      <Badge variant={ACTIVE_STATUS_VARIANTS[row.original.status]}>
        {ACCOUNT_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    meta: { label: 'Criado em' },
    size: 160,
    header: ({ column }) => (
      <TableColumnHeader sortKey="createdAt" column={column}>
        Criado em
      </TableColumnHeader>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
]
