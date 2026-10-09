import { createFileRoute } from '@tanstack/react-router'
import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { withExtra } from '#/lib/list-search'
import { classroomsQueryOptions } from '#/integrations/tanstack-query/queries'

const validateSearch = withExtra(['category'] as const)

export const Route = createFileRoute('/_private/administrator/classrooms/')({
  validateSearch,
  pendingComponent: () => <TableSkeleton />,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(classroomsQueryOptions(deps)),
})
