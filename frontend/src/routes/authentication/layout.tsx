import type * as React from 'react'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { accountQueryOptions } from '#/integrations/tanstack-query/queries'
import { validateRedirectSearch } from '#/lib/redirect-search'
import { SITE_TITLE } from '#/lib/site'

/**
 * O guard inverso: quem já tem sessão não vê o formulário de login. Fica no
 * layout pelo mesmo motivo do `_private` - tela de autenticação nova nasce
 * coberta por estar no lugar certo.
 */
export const Route = createFileRoute('/authentication')({
  validateSearch: validateRedirectSearch,
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(accountQueryOptions())
    } catch {
      // Sem sessão é o caso normal desta área: segue para o formulário.
      return
    }

    // Fora do `try`: um `redirect` é lançado, e lançado de dentro dele seria
    // capturado pelo próprio `catch` que existe para o caso oposto - e o
    // sintoma seria um login que aceita a senha e não sai do lugar.
    //
    // Um destino só, e não um por papel como na referência: aqui os dois papéis
    // - `EDITOR` e `ADMINISTRATOR` - entram no mesmo painel, e a diferença
    // entre eles é o `403` do backend em `/administrator/users`.
    throw redirect({ to: '/painel' })
  },
  head: () => ({ meta: [{ title: `Entrar | ${SITE_TITLE}` }] }),
  component: RouteComponent,
})

function RouteComponent(): React.JSX.Element {
  return <Outlet />
}
