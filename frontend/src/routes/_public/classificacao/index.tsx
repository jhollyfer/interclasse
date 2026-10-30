import { createFileRoute } from '@tanstack/react-router'

import { storefrontBracketsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

/** Todas as chaves de uma vez: cinco modalidades x duas categorias cabem em 100. */
export const BRACKETS_INDEX = { perPage: 100 }

export const Route = createFileRoute('/_public/classificacao/')({
  loader: ({ context }) =>
    context.queryClient
      .query(storefrontBracketsQueryOptions(BRACKETS_INDEX))
      .catch(() => undefined),
  head: () =>
    pageHead({
      title: m.public_nav_standings(),
      description: m.public_standings_head_description(),
      pathname: '/classificacao',
    }),
})
