import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { usersQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { LIST_SEARCH_DEFAULTS } from '#/lib/list-search'

import { validateSearch } from './-search'

export const Route = createFileRoute('/_private/administrator/users/')({
  validateSearch,
  search: { middlewares: [stripSearchParams(LIST_SEARCH_DEFAULTS)] },
  pendingComponent: () => <TableSkeleton />,
  // `query()` without `.catch`: returns the data and propagates the error, like the guard in
  // `_private/layout.tsx`.
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...usersQueryOptions(deps),
      staleTime: 'static',
    }),
})
