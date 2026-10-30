import { createFileRoute } from '@tanstack/react-router'

import { announcementQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { loadOrNotFound } from '#/lib/load-or-not-found'

export const Route = createFileRoute(
  '/_private/administrator/announcements/$id/edit',
)({
  loader: async ({ context, params }) => {
    return loadOrNotFound(() =>
      context.queryClient.query({
        ...announcementQueryOptions(params.id),
        staleTime: 'static',
      }),
    )
  },
})
