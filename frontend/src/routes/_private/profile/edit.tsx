import { createFileRoute } from '@tanstack/react-router'

import { accountQueryOptions } from '#/integrations/tanstack-query/queries'

/**
 * A edição da própria conta: nome, e-mail, avatar e a troca de senha.
 *
 * Mesma `queryOptions` da ficha e do guard do layout, com a mesma chave: chegar
 * aqui pelo botão "Editar perfil" não dispara requisição nova.
 */
export const Route = createFileRoute('/_private/profile/edit')({
  loader: ({ context }) =>
    context.queryClient.query({
      ...accountQueryOptions(),
      staleTime: 'static',
    }),
})
