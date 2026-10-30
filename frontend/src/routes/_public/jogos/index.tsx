import { createFileRoute } from '@tanstack/react-router'

import { storefrontMatchesQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

import { validateSearch } from './-search'

export const Route = createFileRoute('/_public/jogos/')({
  validateSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient
      .query(storefrontMatchesQueryOptions(deps))
      .catch(() => undefined),
  head: () =>
    pageHead({
      title: m.public_nav_games(),
      description: m.public_games_head_description(),
      pathname: '/jogos',
    }),
})
