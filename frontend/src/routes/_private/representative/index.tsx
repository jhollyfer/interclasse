import { createFileRoute } from '@tanstack/react-router'

import { representativeEnrollmentsQueryOptions } from '#/integrations/tanstack-query/queries/representative'

/**
 * Swallowed error (`.catch`): a representative with no linked classroom gets a `404`, and the screen
 * explains that instead of falling into the error page.
 */
export const Route = createFileRoute('/_private/representative/')({
  loader: ({ context }) =>
    context.queryClient
      .query(representativeEnrollmentsQueryOptions())
      .catch(() => undefined),
})
