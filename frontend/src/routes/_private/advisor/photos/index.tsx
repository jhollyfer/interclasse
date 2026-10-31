import { createFileRoute } from '@tanstack/react-router'

import { advisorPhotosQueryOptions } from '#/integrations/tanstack-query/queries/advisor'

/** The photos the advisor uploaded, all on one screen. */
export const MY_PHOTOS = { perPage: 100 }

export const Route = createFileRoute('/_private/advisor/photos/')({
  loader: ({ context }) =>
    context.queryClient.query({
      ...advisorPhotosQueryOptions(MY_PHOTOS),
      staleTime: 'static',
    }),
})
