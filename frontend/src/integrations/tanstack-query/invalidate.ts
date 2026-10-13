import { useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'

/**
 * Invalida várias famílias de chave de uma vez, e só resolve quando todas
 * resolveram. Um lugar só para o `Promise.all` sobre `invalidateQueries` que
 * cada mutation com dependentes (`DEPENDENTS` em `_query-keys.ts`) repetia.
 *
 * O `queryClient` vem do provider, que é o mesmo do contexto do router
 * (`setupRouterSsrQueryIntegration` em `router.tsx`): o cache é um só.
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
