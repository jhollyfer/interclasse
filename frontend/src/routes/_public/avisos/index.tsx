import { createFileRoute } from '@tanstack/react-router'

import { storefrontAnnouncementsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { validateStorefrontSearch } from '#/lib/list-search'
import { SITE_TITLE } from '#/lib/constant'

export const Route = createFileRoute('/_public/avisos/')({
  validateSearch: validateStorefrontSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient
      .query(storefrontAnnouncementsQueryOptions(deps))
      .catch(() => undefined),
  head: () => ({ meta: [{ title: `Avisos | ${SITE_TITLE}` }] }),
})
