import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { classroomsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { LIST_SEARCH_DEFAULTS } from '#/lib/list-search'

import { validateSearch } from './-search'

/** All at once: the school has 24 classrooms, and the card list does not paginate. */
export const CLASSROOM_GRID = { perPage: 100 }

export const Route = createFileRoute('/_private/administrator/classrooms/')({
  validateSearch,
  pendingComponent: () => <TableSkeleton />,
  search: { middlewares: [stripSearchParams(LIST_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => ({ category: search.category }),
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...classroomsQueryOptions({ ...CLASSROOM_GRID, category: deps.category }),
      staleTime: 'static',
    }),
})
