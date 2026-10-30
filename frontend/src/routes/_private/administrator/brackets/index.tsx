import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { bracketsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { LIST_SEARCH_DEFAULTS } from '#/lib/list-search'

import { validateSearch } from './-search'

export const Route = createFileRoute('/_private/administrator/brackets/')({
  validateSearch,
  search: { middlewares: [stripSearchParams(LIST_SEARCH_DEFAULTS)] },
  pendingComponent: () => <TableSkeleton />,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...bracketsQueryOptions(deps),
      staleTime: 'static',
    }),
})
