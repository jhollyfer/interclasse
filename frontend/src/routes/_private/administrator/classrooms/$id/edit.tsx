import { createFileRoute } from '@tanstack/react-router'

import { NotFoundPage } from '#/components/common/not-found-page'
import { classroomQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { loadOrNotFound } from '#/lib/load-or-not-found'

export const Route = createFileRoute(
  '/_private/administrator/classrooms/$id/edit',
)({
  notFoundComponent: () => <NotFoundPage />,
  loader: async ({ context, params }) => {
    return loadOrNotFound(() =>
      context.queryClient.query({
        ...classroomQueryOptions(params.id),
        staleTime: 'static',
      }),
    )
  },
})
