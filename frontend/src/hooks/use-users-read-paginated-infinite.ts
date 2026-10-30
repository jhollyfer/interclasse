import { useInfiniteQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '#/hooks/use-debounced-value'
import { usersInfiniteQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

type UsersInfiniteInput = Readonly<{
  /** O papel das contas buscadas. */
  role: string
  /** O que a pessoa digitou no combobox; o debounce é daqui. */
  search: string
}>

/**
 * As contas de um papel para um combobox com busca no servidor: 20 por página,
 * o termo debounçado entra na chave e a lista cresce por `fetchNextPage`
 * (`frontend.md` §2.1). _doc-lib/tanstack-query.md#guides/infinite-queries.
 */
export function useUsersReadPaginatedInfinite({
  role,
  search,
}: UsersInfiniteInput) {
  const term = useDebouncedValue(search.trim())
  const query = useInfiniteQuery(
    usersInfiniteQueryOptions({
      role,
      sort: 'name',
      perPage: 20,
      search: term || undefined,
    }),
  )

  return {
    users: query.data?.pages.flatMap((page) => page.data) ?? [],
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
