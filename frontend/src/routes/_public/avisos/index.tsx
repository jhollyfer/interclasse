import { createFileRoute } from '@tanstack/react-router'

import { storefrontAnnouncementsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { SITE_TITLE } from '#/lib/constant'

import { validateSearch } from './-search'

export const Route = createFileRoute('/_public/avisos/')({
  validateSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient
      .query(storefrontAnnouncementsQueryOptions(deps))
      .catch(() => undefined),
  head: () => ({ meta: [{ title: `Avisos | ${SITE_TITLE}` }] }),
})
