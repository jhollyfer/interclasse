import { createFileRoute } from '@tanstack/react-router'

import { NotFoundPage } from '#/components/common/not-found-page'
import { userQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { loadOrNotFound } from '#/lib/load-or-not-found'

/**
 * The same `queryOptions` as the detail, with the same key: whoever opens the edit from
 * the detail triggers no new request, the cache is already full.
 */
export const Route = createFileRoute('/_private/administrator/users/$id/edit')({
  notFoundComponent: () => <NotFoundPage />,
  loader: async ({ context, params }) => {
    return loadOrNotFound(() =>
      context.queryClient.query({
        ...userQueryOptions(params.id),
        staleTime: 'static',
      }),
    )
  },
})
