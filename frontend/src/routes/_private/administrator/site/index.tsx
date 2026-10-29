import { createFileRoute } from '@tanstack/react-router'

import { siteQueryOptions } from '#/integrations/tanstack-query/queries'

export const Route = createFileRoute('/_private/administrator/site/')({
  loader: ({ context }) =>
    context.queryClient.query({ ...siteQueryOptions(), staleTime: 'static' }),
})
