import { createFileRoute } from '@tanstack/react-router'

import { accountQueryOptions } from '#/integrations/tanstack-query/queries'

/**
 * A ficha da própria conta: nome, e-mail, avatar, papel, situação e desde
 * quando existe - tudo o que `GET /account` responde.
 *
 * Ler e editar são rotas separadas, como na referência. Papel e situação só
 * aparecem aqui: o `PUT /account` não os aceita, porque o papel é decisão de
 * quem cria a conta e ninguém se inativa. Os dois são do módulo
 * `/administrator/users`, sobre a conta de outro.
 *
 * O `loader` reusa a mesma `queryOptions` do guard de `_private/layout.tsx`, com
 * a mesma chave: aqui não sai requisição nova, o cache já está cheio.
 */
export const Route = createFileRoute('/_private/profile/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(accountQueryOptions()),
})
