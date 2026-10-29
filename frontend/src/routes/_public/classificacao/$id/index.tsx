import { createFileRoute, notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'
import {
  storefrontBracketQueryOptions,
  storefrontBracketsQueryOptions,
} from '#/integrations/tanstack-query/queries'
import { CATEGORY_LABELS } from '#/lib/labels'
import { SITE_TITLE } from '#/lib/constant'

import { BRACKETS_INDEX } from '../index'

export const Route = createFileRoute('/_public/classificacao/$id/')({
  loader: async ({ context, params }) => {
    // A lista é a barra de abas da página; falha nela não esconde a chave.
    void context.queryClient
      .query(storefrontBracketsQueryOptions(BRACKETS_INDEX))
      .catch(() => undefined)

    try {
      return await context.queryClient.query({
        ...storefrontBracketQueryOptions(params.id),
        staleTime: 'static',
      })
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
