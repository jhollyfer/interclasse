import { createFileRoute } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { withExtra } from '#/lib/list-search'
import { bracketsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

const validateSearch = withExtra(['category', 'status'] as const)

export const Route = createFileRoute('/_private/administrator/brackets/')({
  validateSearch,
  pendingComponent: () => <TableSkeleton />,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...bracketsQueryOptions(deps),
      staleTime: 'static',
    }),
})
