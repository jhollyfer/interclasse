import { createFileRoute } from '@tanstack/react-router'

import { photosQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

import { validateSearch } from './-search'

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
