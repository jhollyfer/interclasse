import { IconContext } from '@phosphor-icons/react'
import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import { ThemeProvider } from '#/components/common/theme-provider'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { env } from '#/env'
import { AppDevtools } from '#/integrations/tanstack-query/devtools'
import { noindexMeta, organizationJsonLd } from '#/lib/page-head'
import { isIndexable } from '#/lib/site-environment'
import { THEME_CLASS, readTheme } from '#/lib/theme'
import { m } from '#/paraglide/messages'

import { getLocale } from '../paraglide/runtime'
import appCss from '../styles.css?url'

/**
 * What every route sees in `context`.
 *
 * `type` and not `interface`: this is not module augmentation - it is a local declaration,
 * and the project rule holds (the only legitimate `interface` is the one in
 * `vite-env.d.ts`, which augments Vite's `ImportMetaEnv`).
 */
type RouterContext = {
  queryClient: QueryClient
}

/** The house's default icon: decorative, text-sized, regular stroke (`frontend.md` §10.2). */
const ICON_DEFAULTS = {
  size: '1em',
  weight: 'regular',
  'aria-hidden': true,
} as const

export const Route = createRootRouteWithContext<RouterContext>()({
  // The theme comes from the cookie, read on the server: the first HTML already comes out with the
  // right class (`frontend.md` §6). `isIndexable` is the environment ENV: outside
  // production the whole page answers `noindex` (`frontend.md` §9.7).
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
      // The connection to the API opens together with the HTML (`frontend.md` §9.5).
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
    // `suppressHydrationWarning` only here, and it is mandatory for `system`: without a
    // cookie the server does not know the system preference, and the script before
    // hydration writes the class on `<html>` - a node that diverges by nature
    // (`frontend.md` §3.2). With `light` or `dark` the server already sends the class.
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
          A single provider for the whole tree: it groups the opening delay,
          so moving the mouse from one button to another does not restart the count.
        */}
        <ThemeProvider theme={theme}>
          <IconContext.Provider value={ICON_DEFAULTS}>
            <TooltipProvider delay={300}>{children}</TooltipProvider>
          </IconContext.Provider>
          <Toaster />
        </ThemeProvider>
        <AppDevtools />
        <Scripts />
      </body>
    </html>
  )
}
