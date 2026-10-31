import { createFileRoute, Outlet } from '@tanstack/react-router'
import type * as React from 'react'

import { storefrontSiteQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { Footer } from './-components/footer'
import { Header } from './-components/header'

/** O alvo do "pular para o conteúdo", e o `id` do `<main>`. */
const MAIN_ID = 'conteudo'

/**
 * The shell of every public screen: fixed header, content and footer.
 *
 * **No `beforeLoad`, and it is a decision.** The storefront is the only surface that answers
 * without a session, and the neighboring `_private/layout.tsx` is its exact opposite. A guard
 * here would protect nothing - the backend's `/storefront` does not require a session - and
 * would also turn the anonymous visitor, who is this area's audience, into a
 * redirect to the login.
 *
 * For the same reason no screen here treats `401` as an expired session: the
 * visitor never had one.
 *
 * Pathless group: `_public` does not enter the address. `/matches` is `/matches`, and
 * not `/public/matches` - the shell is code organization, and not an extra level
 * in the URL.
 */
export const Route = createFileRoute('/_public')({
  // The "Sobre" and the regulation appear in the footer of every page. Swallowed failure:
  // the API being down removes the button, not the page.
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
        The page's first tab stop, and invisible until it receives focus.

        The header has the brand, four destinations and the dashboard door, repeated
        on every navigation. Without this link, whoever uses a keyboard or screen reader
        crosses the whole strip on every page.

        `sr-only` with `focus:not-sr-only` and not `display: none`: truly hidden
        it would not receive focus, and the link would cease to exist for whoever
        it serves.
      */}
      <a
        href={'#'.concat(MAIN_ID)}
        className="sr-only rounded-md bg-background px-4 py-2 font-medium text-foreground no-underline focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-tooltip"
      >
        {m.public_skip_to_content()}
      </a>

      <Header />

      {/*
        `pt-16` is the fixed strip's height: without it the header would cover the start
        of every screen. `flex-1` pushes the footer to the end even with little
        content, and `tabIndex={-1}` lets the jump target receive focus - without it
        the browser scrolls here and leaves focus on the link, and the next tab
        goes back to the top.
      */}
      <main id={MAIN_ID} tabIndex={-1} className="flex-1 pt-16">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
