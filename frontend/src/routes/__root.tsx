import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ThemeProvider } from 'next-themes'
import type { QueryClient } from '@tanstack/react-query'

import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { SITE_DESCRIPTION, SITE_TITLE } from '#/lib/constant'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import appCss from '../styles.css?url'

/** O idioma do documento: o site é só em português. */
const LOCALE = 'pt-BR'

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

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: SITE_TITLE,
      },
      {
        name: 'description',
        content: SITE_DESCRIPTION,
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.svg',
        type: 'image/svg+xml',
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
  return (
    // `suppressHydrationWarning` só aqui, e é obrigatório: o `next-themes`
    // escreve `class="dark"` no `<html>` por um script que roda antes da
    // hidratação - é o que evita o flash de tema claro -, então o servidor e o
    // cliente divergem neste elemento por construção.
    <html lang={LOCALE} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {/*
          `attribute="class"` porque o Tailwind 4 deste projeto declara
          `@custom-variant dark (&:is(.dark *))` em `styles.css`: quem liga o
          tema escuro é a classe, não um `data-theme`.
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/*
            Um provider só para toda a árvore: ele agrupa o atraso de abertura,
            então passar o mouse de um botão a outro não recomeça a contagem.
          */}
          <TooltipProvider delay={300}>{children}</TooltipProvider>
        </ThemeProvider>
        <Toaster />
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
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
