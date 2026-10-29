import { createFileRoute, notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'
import { sportQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

export const Route = createFileRoute(
  '/_private/administrator/sports/$id/edit/',
)({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query({
        ...sportQueryOptions(params.id),
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
