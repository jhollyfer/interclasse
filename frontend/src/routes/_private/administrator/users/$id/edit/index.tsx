import { createFileRoute, notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'
import { userQueryOptions } from '#/integrations/tanstack-query/queries'

/**
 * A mesma `queryOptions` do detalhe, com a mesma chave: quem abre a edição a
 * partir do detalhe não dispara requisição nova, o cache já está cheio.
 */
export const Route = createFileRoute('/_private/administrator/users/$id/edit/')(
  {
    loader: async ({ context, params }) => {
      try {
        return await context.queryClient.query({
          ...userQueryOptions(params.id),
          staleTime: 'static',
        })
      } catch (error) {
        // Só o 404 vira "não encontrado" na rota; rede fora, 403 e 500 sobem.
        if (
          error instanceof HTTPError &&
          error.status === HTTPStatus.NOT_FOUND
        ) {
          throw notFound()
        }

        throw error
      }
    },
  },
)
