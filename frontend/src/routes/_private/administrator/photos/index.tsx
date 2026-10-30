import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { photosQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { LIST_SEARCH_DEFAULTS } from '#/lib/list-search'

import { validateSearch } from './-search'

/** A fila inteira numa tela: fotos de jogos escolares não passam de algumas dezenas. */
export const PHOTO_PAGE = { perPage: 100 }

export const Route = createFileRoute('/_private/administrator/photos/')({
  validateSearch,
  pendingComponent: () => <TableSkeleton />,
  search: { middlewares: [stripSearchParams(LIST_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...photosQueryOptions({ ...PHOTO_PAGE, status: deps.status }),
      staleTime: 'static',
    }),
})
