import type * as React from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import { storefrontSiteQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { Footer } from './-components/footer'
import { Header } from './-components/header'

/** O alvo do "pular para o conteúdo", e o `id` do `<main>`. */
const MAIN_ID = 'conteudo'

/**
 * A casca de toda tela pública: cabeçalho fixo, conteúdo e rodapé.
 *
 * **Sem `beforeLoad`, e é decisão.** A vitrine é a única superfície que responde
 * sem sessão, e o `_private/layout.tsx` ao lado é o oposto exato dela. Um guard
 * aqui não protegeria nada - o `/storefront` do backend não exige sessão - e
 * ainda transformaria o visitante anônimo, que é o público desta área, num
 * redirecionamento para o login.
 *
 * Pelo mesmo motivo nenhuma tela daqui trata `401` como sessão expirada: o
 * visitante nunca teve uma.
 *
 * Grupo pathless: `_public` não entra no endereço. `/noticias` é `/noticias`, e
 * não `/public/noticias` - a casca é organização de código, e não um nível a
 * mais na URL.
 */
export const Route = createFileRoute('/_public')({
  // O "Sobre" e o regulamento aparecem no rodapé de toda página. Falha engolida:
  // a API fora do ar tira o botão, não a página.
  loader: ({ context }) =>
    context.queryClient
      .query(storefrontSiteQueryOptions())
      .catch(() => undefined),
  component: RouteComponent,
})

function RouteComponent(): React.JSX.Element {
  return (
    <div className="flex min-h-svh flex-col">
      {/*
        O primeiro tabulador da página, e invisível até receber foco.

        O cabeçalho tem a marca, quatro destinos e a porta do painel, repetidos
        a cada navegação. Sem este link, quem usa teclado ou leitor de tela
        atravessa a faixa inteira em toda página.

        `sr-only` com `focus:not-sr-only` e não `display: none`: escondido de
        verdade ele não receberia foco, e o link deixaria de existir para quem
        ele serve.
      */}
      <a
        href={'#'.concat(MAIN_ID)}
        className="sr-only rounded-md bg-background px-4 py-2 font-medium text-foreground no-underline focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {m.public_skip_to_content()}
      </a>

      <Header />

      {/*
        `pt-16` é a altura da faixa fixa: sem ela o cabeçalho cobriria o começo
        de toda tela. `flex-1` empurra o rodapé para o fim mesmo com pouco
        conteúdo, e `tabIndex={-1}` deixa o alvo do salto receber foco - sem ele
        o navegador rola até aqui e deixa o foco no link, e a tabulação seguinte
        volta para o topo.
      */}
      <main id={MAIN_ID} tabIndex={-1} className="flex-1 pt-16">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
