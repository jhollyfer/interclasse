import { createFileRoute } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { announcementsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

import { validateSearch } from './-search'

export const Route = createFileRoute('/_private/administrator/announcements/')({
  validateSearch,
  pendingComponent: () => <TableSkeleton />,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...announcementsQueryOptions(deps),
      staleTime: 'static',
    }),
})
