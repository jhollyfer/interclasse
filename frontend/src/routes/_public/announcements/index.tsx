import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { storefrontAnnouncementsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { LIST_SEARCH_DEFAULTS } from '#/lib/list-search'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

import { validateSearch } from './-search'
import { ListSkeleton } from '../-components/list-skeleton'

export const Route = createFileRoute('/_public/announcements/')({
  validateSearch,
  search: { middlewares: [stripSearchParams(LIST_SEARCH_DEFAULTS)] },
  pendingComponent: () => <ListSkeleton />,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient
      .query(storefrontAnnouncementsQueryOptions(deps))
      .catch(() => undefined),
  head: () =>
    pageHead({
      title: m.public_nav_announcements(),
      description: m.public_announcements_head_description(),
      pathname: '/announcements',
    }),
})
