import { createFileRoute } from '@tanstack/react-router'

import { reportQueryOptions } from '#/integrations/tanstack-query/queries'

export const Route = createFileRoute('/_private/administrator/reports/')({
  loader: ({ context }) => context.queryClient.query(reportQueryOptions()),
})
