import { createFileRoute } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { validateListSearch } from '#/lib/list-search'
import { sportsQueryOptions } from '#/integrations/tanstack-query/queries'

const validateSearch = validateListSearch

export const Route = createFileRoute('/_private/administrator/sports/')({
  validateSearch,
  pendingComponent: () => <TableSkeleton />,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(sportsQueryOptions(deps)),
})
