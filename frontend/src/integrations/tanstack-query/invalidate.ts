import { useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'

/**
 * Invalidates several key families at once, and only resolves when all of them
 * resolved. One place for the `Promise.all` over `invalidateQueries` that
 * every mutation with dependents (`DEPENDENTS` in `_query-keys.ts`) repeated.
 *
 * The `queryClient` comes from the provider, which is the same as the router context's
 * (`setupRouterSsrQueryIntegration` in `router.tsx`): the cache is a single one.
 */
export function useInvalidate(): (
  queryKeys: ReadonlyArray<QueryKey>,
) => Promise<void> {
  const queryClient = useQueryClient()

  return async function invalidate(queryKeys) {
    await Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    )
  }
}
