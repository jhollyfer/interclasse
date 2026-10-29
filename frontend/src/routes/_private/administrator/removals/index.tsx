import { createFileRoute } from '@tanstack/react-router'

import { enrollmentRemovalsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

export const ADMINISTRATOR_REMOVALS = { perPage: 100 }

export const Route = createFileRoute('/_private/administrator/removals/')({
  loader: ({ context }) =>
    context.queryClient.query(
      enrollmentRemovalsQueryOptions(ADMINISTRATOR_REMOVALS),
    ),
})
