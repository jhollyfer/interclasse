import { createFileRoute } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { validateListSearch } from '#/lib/list-search'
import { announcementsQueryOptions } from '#/integrations/tanstack-query/queries'

const validateSearch = validateListSearch

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
