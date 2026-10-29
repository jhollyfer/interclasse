import { createFileRoute } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { sportsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

import { validateSearch } from './-search'

export const Route = createFileRoute('/_private/administrator/sports/')({
  validateSearch,
  pendingComponent: () => <TableSkeleton />,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...sportsQueryOptions(deps),
      staleTime: 'static',
    }),
})
