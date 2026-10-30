import { useInfiniteQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '#/hooks/use-debounced-value'
import { sportsInfiniteQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

/**
 * As modalidades para um combobox com busca no servidor: 20 por página, o
 * termo debounçado entra na chave e a lista cresce por `fetchNextPage`
 * (`frontend.md` §2.1). _doc-lib/tanstack-query.md#guides/infinite-queries.
 */
export function useSportsReadPaginatedInfinite(search: string) {
  const term = useDebouncedValue(search.trim())
  const query = useInfiniteQuery(
    sportsInfiniteQueryOptions({
      sort: 'name',
      perPage: 20,
      search: term || undefined,
    }),
  )

  return {
    sports: query.data?.pages.flatMap((page) => page.data) ?? [],
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
