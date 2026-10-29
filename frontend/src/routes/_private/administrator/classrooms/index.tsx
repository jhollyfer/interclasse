import { createFileRoute } from '@tanstack/react-router'

import { classroomsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

import { validateSearch } from './-search'

/** Todas de uma vez: a escola tem 24 turmas, e o cartão não pagina. */
export const CLASSROOM_GRID = { perPage: 100 }

export const Route = createFileRoute('/_private/administrator/classrooms/')({
  validateSearch,
  loaderDeps: ({ search }) => ({ category: search.category }),
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...classroomsQueryOptions({ ...CLASSROOM_GRID, category: deps.category }),
      staleTime: 'static',
    }),
})
