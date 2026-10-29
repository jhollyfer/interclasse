import { createFileRoute } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { usersQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

import { validateSearch } from './-search'

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
