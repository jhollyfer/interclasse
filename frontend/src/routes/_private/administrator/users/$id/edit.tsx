import { createFileRoute } from '@tanstack/react-router'

import { userQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { loadOrNotFound } from '#/lib/load-or-not-found'

/**
 * A mesma `queryOptions` do detalhe, com a mesma chave: quem abre a edição a
 * partir do detalhe não dispara requisição nova, o cache já está cheio.
 */
export const Route = createFileRoute('/_private/administrator/users/$id/edit')({
  loader: async ({ context, params }) => {
    return loadOrNotFound(() =>
      context.queryClient.query({
        ...userQueryOptions(params.id),
        staleTime: 'static',
      }),
    )
  },
})
