import { createFileRoute, notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'
import { storefrontBracketQueryOptions } from '#/integrations/tanstack-query/queries'
import { CATEGORY_LABELS } from '#/lib/labels'
import { SITE_TITLE } from '#/lib/constant'

export const Route = createFileRoute('/_public/classificacao/$id')({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        storefrontBracketQueryOptions(params.id),
      )
    } catch (error) {
      if (error instanceof HTTPError && error.status === HTTPStatus.NOT_FOUND) {
        throw notFound()
      }

      throw error
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.sport.name ?? 'Chave'} ${CATEGORY_LABELS[loaderData?.category ?? ''] ?? ''} | ${SITE_TITLE}`,
      },
    ],
  }),
})
