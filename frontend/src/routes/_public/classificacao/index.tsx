import { createFileRoute } from '@tanstack/react-router'

import { storefrontBracketsQueryOptions } from '#/integrations/tanstack-query/queries'
import { SITE_TITLE } from '#/lib/constant'

/** Todas as chaves de uma vez: cinco modalidades x duas categorias cabem em 100. */
export const BRACKETS_INDEX = { perPage: 100 }

export const Route = createFileRoute('/_public/classificacao/')({
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(
      storefrontBracketsQueryOptions(BRACKETS_INDEX),
    ),
  head: () => ({ meta: [{ title: `Classificação | ${SITE_TITLE}` }] }),
})
