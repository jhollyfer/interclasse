import { createFileRoute } from '@tanstack/react-router'

import { withExtra } from '#/lib/list-search'
import { photosQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

const validateSearch = withExtra(['status'] as const)

/** A fila inteira numa tela: fotos de jogos escolares não passam de algumas dezenas. */
export const PHOTO_PAGE = { perPage: 100 }

export const Route = createFileRoute('/_private/administrator/photos/')({
  validateSearch,
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...photosQueryOptions({ ...PHOTO_PAGE, status: deps.status }),
      staleTime: 'static',
    }),
})
