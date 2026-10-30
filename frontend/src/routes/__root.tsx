import { IconContext } from '@phosphor-icons/react'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import { ThemeProvider } from '#/components/common/theme-provider'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { env } from '#/env'
import { noindexMeta, organizationJsonLd } from '#/lib/page-head'
import { isIndexable } from '#/lib/site-environment'
import { THEME_CLASS, readTheme } from '#/lib/theme'
import { m } from '#/paraglide/messages'

import { getLocale } from '../paraglide/runtime'
import appCss from '../styles.css?url'

/**
 * O que toda rota enxerga em `context`.
 *
 * `type` e não `interface`: aqui não é module augmentation - é declaração local,
 * e a regra do projeto vale (o único `interface` legítimo é o de
 * `vite-env.d.ts`, que aumenta o `ImportMetaEnv` do Vite).
 */
type RouterContext = {
  queryClient: QueryClient
}

/** Ícone padrão da casa: decorativo, do tamanho do texto, traço regular (`frontend.md` §10.2). */
const ICON_DEFAULTS = {
  size: '1em',
  weight: 'regular',
  'aria-hidden': true,
} as const

export const Route = createRootRouteWithContext<RouterContext>()({
  // O tema vem do cookie, lido no servidor: o primeiro HTML já sai com a classe
  // certa (`frontend.md` §6). `isIndexable` é a ENV de ambiente: fora de
  // produção a página inteira responde `noindex` (`frontend.md` §9.7).
  loader: async () => ({
    theme: readTheme(),
    indexable: await isIndexable(),
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: m.common_site_title(),
      },
      {
        name: 'description',
        content: m.common_site_description(),
      },
      ...noindexMeta(loaderData?.indexable),
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: organizationJsonLd(),
      },
    ],
    links: [
      // A conexão com a API abre junto do HTML (`frontend.md` §9.5).
      {
        rel: 'preconnect',
        href: env.VITE_API_URL,
        crossOrigin: 'use-credentials',
      },
      {
        rel: 'icon',
        href: '/favicon.png',
        type: 'image/png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.JSX.Element {
  const { theme } = Route.useLoaderData()

  return (
    // `suppressHydrationWarning` só aqui, e é obrigatório para `system`: sem
    // cookie o servidor não sabe a preferência do sistema, e o script antes da
    // hidratação escreve a classe no `<html>` - nó que diverge por natureza
    // (`frontend.md` §3.2). Com `light` ou `dark` o servidor já manda a classe.
    <html
      lang={getLocale()}
      className={THEME_CLASS[theme]}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body>
        {/*
          Um provider só para toda a árvore: ele agrupa o atraso de abertura,
          então passar o mouse de um botão a outro não recomeça a contagem.
        */}
        <ThemeProvider theme={theme}>
          <IconContext.Provider value={ICON_DEFAULTS}>
            <TooltipProvider delay={300}>{children}</TooltipProvider>
          </IconContext.Provider>
          <Toaster />
        </ThemeProvider>
        {/*
          Só em desenvolvimento. Os dois painéis de dentro já se anulam sozinhos
          fora dele - `TanStackRouterDevtoolsPanel` e `ReactQueryDevtoolsPanel`
          viram função vazia quando `NODE_ENV !== 'development'` -, mas a casca
          `TanStackDevtools` não tem essa guarda: sem esta linha o botão
          flutuante das ferramentas aparece por cima da vitrine para quem entrou
          para ler uma notícia, e o núcleo `@tanstack/devtools` vai junto no
          bundle.
        */}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              {
                name: 'Tanstack Query',
                render: <ReactQueryDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
