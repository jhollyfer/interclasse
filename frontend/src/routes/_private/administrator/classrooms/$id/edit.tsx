import { createFileRoute } from '@tanstack/react-router'

import { classroomQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { loadOrNotFound } from '#/lib/load-or-not-found'

export const Route = createFileRoute(
  '/_private/administrator/classrooms/$id/edit',
)({
  loader: async ({ context, params }) => {
    return loadOrNotFound(() =>
      context.queryClient.query({
        ...classroomQueryOptions(params.id),
        staleTime: 'static',
      }),
    )
  },
})
