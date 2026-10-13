import { createFileRoute, notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'
import { userQueryOptions } from '#/integrations/tanstack-query/queries'

export const Route = createFileRoute('/_private/administrator/users/$id/')({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        userQueryOptions(params.id),
      )
    } catch (error) {
      // Só o 404 vira "não encontrado" na rota. Rede fora e 500 continuam
      // subindo, senão um backend indisponível pareceria registro apagado.
      // Quem desenha é o `defaultNotFoundComponent` do `router.tsx`.
      //
      // O `403` do módulo inteiro também sobe: quem não é administrador não
      // erra de endereço, erra de permissão, e dizer "não existe" esconderia
      // isso.
      if (error instanceof HTTPError && error.status === HTTPStatus.NOT_FOUND) {
        throw notFound()
      }

      throw error
    }
  },
})
