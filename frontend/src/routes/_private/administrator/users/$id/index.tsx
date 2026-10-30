import { createFileRoute } from '@tanstack/react-router'

import { userQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { loadOrNotFound } from '#/lib/load-or-not-found'

export const Route = createFileRoute('/_private/administrator/users/$id/')({
  loader: async ({ context, params }) => {
    return loadOrNotFound(() =>
      context.queryClient.query({
        ...userQueryOptions(params.id),
        staleTime: 'static',
      }),
    )
  },
})
