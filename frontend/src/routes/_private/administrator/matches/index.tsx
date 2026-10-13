import { createFileRoute } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { withExtra } from '#/lib/list-search'
import { matchesQueryOptions } from '#/integrations/tanstack-query/queries'

const validateSearch = withExtra([
  'sportId',
  'category',
  'phase',
  'status',
] as const)

export const Route = createFileRoute('/_private/administrator/matches/')({
  validateSearch,
  pendingComponent: () => <TableSkeleton />,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...matchesQueryOptions(deps),
      staleTime: 'static',
    }),
})
