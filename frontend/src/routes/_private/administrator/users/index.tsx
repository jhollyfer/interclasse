import { createFileRoute } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { withExtra } from '#/lib/list-search'
import { usersQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

/**
 * `?role=` e `?status=` recortam a listagem, como o
 * `UserPaginateValidator` aceita: um separa quem administra de
 * quem edita, o outro separa quem entra de quem foi desativado sem ser
 * arquivado.
 *
 * `as const` não é enfeite: sem ele `TKey` infere `string`, o retorno vira um
 * índice aberto e a união de search do roteador deixa de fechar - os
 * componentes genéricos da tabela voltam a não compilar.
 */
const validateSearch = withExtra(['role', 'status'] as const)

export const Route = createFileRoute('/_private/administrator/users/')({
  validateSearch,
  pendingComponent: () => <TableSkeleton />,
  // `query()` sem `.catch`: devolve o dado e propaga o erro, como o guard em
  // `_private/layout.tsx`.
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...usersQueryOptions(deps),
      staleTime: 'static',
    }),
})
