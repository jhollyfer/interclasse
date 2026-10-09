import { createFileRoute } from '@tanstack/react-router'

import { storefrontAnnouncementsQueryOptions } from '#/integrations/tanstack-query/queries'
import { validateStorefrontSearch } from '#/lib/list-search'
import { SITE_TITLE } from '#/lib/site'

export const Route = createFileRoute('/_public/avisos/')({
  validateSearch: validateStorefrontSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.prefetchQuery(
      storefrontAnnouncementsQueryOptions(deps),
    ),
  head: () => ({ meta: [{ title: `Avisos | ${SITE_TITLE}` }] }),
})
