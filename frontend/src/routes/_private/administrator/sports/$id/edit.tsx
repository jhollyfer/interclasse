import { createFileRoute, notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'
import { sportQueryOptions } from '#/integrations/tanstack-query/queries'

export const Route = createFileRoute('/_private/administrator/sports/$id/edit')(
  {
    loader: async ({ context, params }) => {
      try {
        return await context.queryClient.ensureQueryData(
          sportQueryOptions(params.id),
        )
      } catch (error) {
        if (
          error instanceof HTTPError &&
          error.status === HTTPStatus.NOT_FOUND
        ) {
          throw notFound()
        }

        throw error
      }
    },
  },
)
