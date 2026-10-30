import type * as React from 'react'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { accountQueryOptions } from '#/integrations/tanstack-query/queries/account'
import { SITE_TITLE } from '#/lib/constant'
import { m } from '#/paraglide/messages'

import { validateSearch } from './-search'

/**
 * O guard inverso: quem já tem sessão não vê o formulário de login. Fica no
 * layout pelo mesmo motivo do `_private` - tela de autenticação nova nasce
 * coberta por estar no lugar certo.
 */
export const Route = createFileRoute('/authentication')({
  validateSearch,
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.query({
        ...accountQueryOptions(),
        staleTime: 'static',
      })
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
  head: () => ({
    meta: [{ title: `${m.auth_page_title()} | ${SITE_TITLE()}` }],
  }),
  component: RouteComponent,
})

function RouteComponent(): React.JSX.Element {
  return <Outlet />
}
