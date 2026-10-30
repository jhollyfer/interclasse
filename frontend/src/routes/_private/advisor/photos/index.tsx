import { createFileRoute } from '@tanstack/react-router'

import { advisorPhotosQueryOptions } from '#/integrations/tanstack-query/queries/advisor'

/** As fotos que o conselheiro enviou, todas numa tela. */
export const MY_PHOTOS = { perPage: 100 }

export const Route = createFileRoute('/_private/advisor/photos/')({
  loader: ({ context }) =>
    context.queryClient.query({
      ...advisorPhotosQueryOptions(MY_PHOTOS),
      staleTime: 'static',
    }),
})
