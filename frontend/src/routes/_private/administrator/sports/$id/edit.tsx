import { createFileRoute } from '@tanstack/react-router'

import { sportQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { loadOrNotFound } from '#/lib/load-or-not-found'

export const Route = createFileRoute('/_private/administrator/sports/$id/edit')(
  {
    loader: async ({ context, params }) => {
      return loadOrNotFound(() =>
        context.queryClient.query({
          ...sportQueryOptions(params.id),
          staleTime: 'static',
        }),
      )
    },
  },
)
