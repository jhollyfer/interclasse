import * as shared from '@interclasse/shared'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import {
  NotFoundPage,
  NotFoundPageActions,
  NotFoundPageDescription,
  NotFoundPageHomeButton,
  NotFoundPageServerError,
  NotFoundPageTitle,
} from '#/components/common/not-found-page'
import { HTTPError } from '#/integrations/tanstack-query/http'

import { getContext } from './integrations/tanstack-query/query-context'
import { deLocalizeUrl, getLocale, localizeUrl } from './paraglide/runtime'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  // As mensagens de validação do Zod saem no idioma da tela. Só o cliente
  // valida formulário; no servidor a configuração global do Zod seria dividida
  // entre requisições de idiomas diferentes. `shared.` e não o nome solto: a
  // função não é um hook, e o prefixo `use` do contrato dispararia a regra.
  if (typeof window !== 'undefined') shared.useValidatorLocale(getLocale())

  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    // A árvore de rotas é uma só: `/es/jogos` entra como `/jogos` e sai com o
    // prefixo do idioma atual (_doc-lib/tanstack-router.md#guide/url-rewrites).
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => <NotFoundPage />,

    /*
     * A saída de tudo que falha e não foi tratado.
     *
     * Rota sem `errorComponent` e router sem padrão caem na tela embutida do
     * TanStack, que em produção é um bloco de texto sem estilo. Ter 404
     * desenhado e nenhuma tela de erro é o desequilíbrio de sempre: a falha de
     * rede num `loader` é bem mais frequente que uma URL digitada errada.
     *
     * `reset` antes de "voltar ao início": quase todo erro daqui é o `loader`
     * que não respondeu, e refazer a tentativa resolve sem perder o lugar. O
     * caminho para casa fica como segunda saída, não como única.
     */
    defaultErrorComponent: ({ error, reset }) => {
      /*
       * O 4xx do `loader` traz mensagem escrita para quem lê a tela - "Esta
       * notícia foi arquivada", "Evento não encontrado" -, e mostrá-la é o que
       * separa "a falha é nossa" de "a situação é esta". Sem isto, uma notícia
       * arquivada pelo editor recebia "Algo quebrou aqui, a falha é nossa" e
       * quem lia ficava sem saber o que fazer.
       *
       * Só 4xx: a mensagem de um 5xx é do servidor para o log, e repeti-la na
       * tela não ajuda ninguém e pode vazar detalhe de implementação.
       */
      let handled: HTTPError | null = null
      if (
        error instanceof HTTPError &&
        error.status >= 400 &&
        error.status < 500
      )
        handled = error

      if (handled)
        return (
          <NotFoundPage code={String(handled.status)}>
            <NotFoundPageTitle>{handled.message}</NotFoundPageTitle>
            <NotFoundPageDescription>
              Se você chegou aqui por um link, ele pode ter mudado de lugar.
            </NotFoundPageDescription>
            <NotFoundPageActions>
              <NotFoundPageHomeButton />
            </NotFoundPageActions>
          </NotFoundPage>
        )

      return <NotFoundPageServerError onRetry={reset} />
    },
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}
