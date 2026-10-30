import { createFileRoute } from '@tanstack/react-router'

import { bracketQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { loadOrNotFound } from '#/lib/load-or-not-found'

export const Route = createFileRoute('/_private/administrator/brackets/$id/')({
  loader: async ({ context, params }) => {
    return loadOrNotFound(() =>
      context.queryClient.query({
        ...bracketQueryOptions(params.id),
        staleTime: 'static',
      }),
    )
  },
})
