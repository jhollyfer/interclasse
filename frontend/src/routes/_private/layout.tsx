import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import type * as React from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { MaiyuCredit } from '#/components/common/maiyu-credit'
import { NotFoundPageServerError } from '#/components/common/not-found-page'
import { UploadingProvider } from '#/components/common/uploading-context'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'
import { Spinner } from '#/components/ui/spinner'
import { TABLET_BREAKPOINT, useIsBelow } from '#/hooks/use-mobile'
import { accountQueryOptions } from '#/integrations/tanstack-query/queries/account'
import { breadcrumbTitle, buildBreadcrumbs } from '#/lib/breadcrumbs'
import { m } from '#/paraglide/messages'

import { Header } from './-components/header'
import { Sidebar } from './-components/sidebar'

/**
 * O portão do painel. Fica no layout, e não em cada tela, porque assim rota nova
 * dentro de `_private/` nasce protegida por estar no lugar certo - que é a mesma
 * ideia do `middleware.auth()` aplicado ao grupo em `backend/start/routes.ts`.
 *
 * **Sem verificação de papel aqui, e é decisão.** Quem autoriza é o backend: o
 * grupo `/administrator` aceita `EDITOR` e `ADMINISTRATOR`, e as rotas que só a
 * administradora pode abrir - o módulo `/administrator/users` inteiro e todo
 * purge - respondem `403`. Repetir a matriz no cliente daria dois lugares para
 * ela ficar desatualizada, e o do cliente não protege nada: quem quer chamar a
 * API chama sem passar por esta tela.
 */
export const Route = createFileRoute('/_private')({
  // O painel não tem o que indexar, e o HTML do servidor não sabe a largura da
  // tela: desenhava a barra lateral aberta, a hidratação recolhia em tablet e o
  // clique do meio-tempo caía no lugar errado. Dados no servidor, tela no
  // cliente - como no lowcodejs.
  ssr: 'data-only',
  // Sem HTML do servidor, é isto que aparece até o JS montar o painel - em
  // vez de uma página em branco.
  pendingComponent: () => (
    <div className="flex h-svh items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  ),
  beforeLoad: async ({ context, location }) => {
    try {
      // `query()` com `staleTime: 'static'` (o antigo `ensureQueryData`):
      // devolve o dado e propaga o erro. Engolir o erro aqui faria o guard
      // nunca reprovar.
      const account = await context.queryClient.query({
        ...accountQueryOptions(),
        staleTime: 'static',
      })

      // Volta para o contexto da rota: toda tela descendente lê o usuário por
      // `useRouteContext()`, sem consulta nova.
      return { account }
    } catch {
      // Qualquer falha aqui é ausência de sessão utilizável: o `request` já
      // tentou renovar com o refresh token antes de deixar o erro subir.
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },
  // Um título por tela sem um `head()` em cada rota: a trilha já sabe onde se
  // está. Aba com "Jogos Estudantis" em todas não se distingue de outra.
  head: ({ matches }) => {
    const title = breadcrumbTitle(buildBreadcrumbs(matches))

    return {
      meta: [
        { title: [title, m.common_site_title()].filter(Boolean).join(' | ') },
        // Área restrita fora do índice (`frontend.md` §9.7).
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    }
  },
  component: RouteComponent,
})

/** O alvo do "pular para o conteúdo", e o `id` do `<main>` que o `SidebarInset` renderiza. */
const MAIN_ID = 'conteudo'

function RouteComponent(): React.JSX.Element {
  const tablet = useIsBelow(TABLET_BREAKPOINT)

  return (
    // `h-svh` sobre o `min-h-svh` do componente: com altura mínima o container
    // cresce junto com o conteúdo, e uma altura que cresce não limita ninguém -
    // o `PageShell` das telas nunca conseguiria prender o rodapé. Altura fixa
    // dá o teto, e quem rola passa a ser a área interna de cada tela.
    <SidebarProvider collapsed={tablet} className="h-svh overflow-hidden">
      {/*
        A barra lateral do painel abre com nove destinos, e eles vêm antes do
        conteúdo em toda tela, a cada navegação.

        `sr-only` com `focus:not-sr-only`, e não `display: none`: escondido de
        verdade o link não receberia foco e deixaria de existir para quem ele
        serve.
      */}
      <a
        href={'#'.concat(MAIN_ID)}
        className="sr-only rounded-md bg-background px-4 py-2 font-medium text-foreground no-underline focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {m.panel_skip_to_content()}
      </a>

      <Sidebar />

      {/* `tabIndex={-1}` para o alvo do salto poder receber o foco: sem ele o
          navegador rola até aqui e deixa o foco no link, e a tabulação seguinte
          volta para o topo da barra lateral. */}
      {/*
        `min-w-0` é o par horizontal do `min-h-0`, e faz falta pelo mesmo
        motivo: o `SidebarInset` é item de um flex em linha, e item de flex não
        encolhe abaixo do próprio conteúdo por default. Uma tabela larga
        empurrava a área inteira para além da tela - e como o `SidebarProvider`
        acima é `overflow-hidden`, o que passava do fim era **recortado**, não
        rolável. A última coluna da tabela, que é a do menu de ações, é
        exatamente a que mora nessa borda.
      */}
      <SidebarInset id={MAIN_ID} tabIndex={-1} className="min-h-0 min-w-0">
        <Header />

        {/*
          O provider fica aqui, e não em cada formulário: o upload acontece na
          escolha do arquivo e o formulário só conhece o `id` depois que ele
          existe, então **todo** botão de salvar do painel precisa saber se há
          arquivo em voo. Um por tela seriam sete chances de esquecer numa
          oitava - e a falha é silenciosa, porque `useRegisterUpload` fora do
          provider não faz nada e o registro nasce sem imagem, sem erro nenhum.
        */}
        <UploadingProvider>
          {/*
            `min-h-0` é o que faz o `PageShell` das telas conseguir prender o
            rodapé: sem ele um filho flex não encolhe abaixo do próprio
            conteúdo, a área de rolagem interna nunca recebe altura limitada, e
            o scroll vaza para a página inteira.

            `overflow-auto` é o par da altura fixa acima: as telas que **não**
            usam `PageShell` - formulários, painel inicial - voltam a rolar por
            inteiro em vez de terem o conteúdo recortado.
          */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
            {/*
              Erro de query que escapa de uma tela (`useSuspenseQuery`) para
              aqui, e não para a fronteira do router: o painel continua de pé,
              e "Tentar de novo" limpa o erro guardado no cache do Query antes
              de remontar - sem isso a query refaria e a fronteira seguiria
              mostrando o erro antigo (`frontend.md` §5).
            */}
            <QueryErrorResetBoundary>
              {({ reset }) => (
                <ErrorBoundary
                  onReset={reset}
                  fallbackRender={({ resetErrorBoundary }) => (
                    <NotFoundPageServerError onRetry={resetErrorBoundary} />
                  )}
                >
                  <Outlet />
                </ErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          </div>
        </UploadingProvider>

        {/* O crédito fica fora da área que rola: sempre no pé, abaixo da
            paginação, sem disputar espaço com a tela. */}
        <footer className="text-muted-foreground shrink-0 border-t px-4 py-2 text-xs [&_a]:text-foreground">
          <MaiyuCredit />
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
