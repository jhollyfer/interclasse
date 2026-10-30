import { createFileRoute } from '@tanstack/react-router'

import { storefrontAnnouncementsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

import { validateSearch } from './-search'

export const Route = createFileRoute('/_public/avisos/')({
  validateSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient
      .query(storefrontAnnouncementsQueryOptions(deps))
      .catch(() => undefined),
  head: () =>
    pageHead({
      title: m.public_nav_announcements(),
      description: m.public_announcements_head_description(),
      pathname: '/avisos',
    }),
})
