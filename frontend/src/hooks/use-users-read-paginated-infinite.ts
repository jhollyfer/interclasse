import { useInfiniteQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '#/hooks/use-debounced-value'
import { usersInfiniteQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

type UsersInfiniteInput = Readonly<{
  /** The role of the accounts searched. */
  role: string
  /** What the person typed in the combobox; the debounce happens here. */
  search: string
}>

/**
 * The accounts of a role for a combobox with server search: 20 per page,
 * the debounced term enters the key and the list grows through `fetchNextPage`
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
