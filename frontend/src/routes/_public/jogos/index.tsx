import { createFileRoute } from '@tanstack/react-router'

import { storefrontMatchesQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { SITE_TITLE } from '#/lib/constant'

import { validateSearch } from './-search'

export const Route = createFileRoute('/_public/jogos/')({
  validateSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient
      .query(storefrontMatchesQueryOptions(deps))
      .catch(() => undefined),
  head: () => ({ meta: [{ title: `Jogos | ${SITE_TITLE}` }] }),
})
