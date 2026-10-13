import { createFileRoute, notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'
import { bracketQueryOptions } from '#/integrations/tanstack-query/queries'

export const Route = createFileRoute('/_private/administrator/brackets/$id/')({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query({
        ...bracketQueryOptions(params.id),
        staleTime: 'static',
      })
    } catch (error) {
      if (error instanceof HTTPError && error.status === HTTPStatus.NOT_FOUND) {
        throw notFound()
      }

      throw error
    }
  },
})
