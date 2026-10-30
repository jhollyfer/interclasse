import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { storefrontMatchesQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { LIST_SEARCH_DEFAULTS } from '#/lib/list-search'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

import { validateSearch } from './-search'
import { ListSkeleton } from '../-components/list-skeleton'

export const Route = createFileRoute('/_public/jogos/')({
  validateSearch,
  search: { middlewares: [stripSearchParams(LIST_SEARCH_DEFAULTS)] },
  pendingComponent: () => <ListSkeleton />,
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
