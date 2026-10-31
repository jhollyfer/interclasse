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
 * The dashboard gate. It lives in the layout, and not on each screen, because that way a new route
 * inside `_private/` is born protected by being in the right place - which is the same
 * idea as the `middleware.auth()` applied to the group in `backend/start/routes.ts`.
 *
 * **No role check here, and it is a decision.** Whoever authorizes is the backend: the
 * `/administrator` group accepts `EDITOR` and `ADMINISTRATOR`, and the routes that only the
 * administrator can open - the whole `/administrator/users` module and every
 * purge - answer `403`. Repeating the matrix on the client would give two places for
 * it to go stale, and the client's protects nothing: whoever wants to call the
 * API calls it without going through this screen.
 */
export const Route = createFileRoute('/_private')({
  // The dashboard has nothing to index, and the server's HTML does not know the screen
  // width: it drew the sidebar open, hydration collapsed it on tablet and the
  // in-between click landed in the wrong place. Data on the server, screen on the
  // client - as in lowcodejs.
  ssr: 'data-only',
  // Without server HTML, this is what shows up until the JS mounts the dashboard - instead
  // of a blank page.
  pendingComponent: () => (
    <div className="flex h-svh items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  ),
  beforeLoad: async ({ context, location }) => {
    try {
      // `query()` with `staleTime: 'static'` (the former `ensureQueryData`):
      // returns the data and propagates the error. Swallowing the error here would make the guard
      // never reject.
      const account = await context.queryClient.query({
        ...accountQueryOptions(),
        staleTime: 'static',
      })

      // Back into the route context: every descendant screen reads the user through
      // `useRouteContext()`, with no new query.
      return { account }
    } catch {
      // Any failure here is the absence of a usable session: `request` already
      // tried to renew with the refresh token before letting the error bubble up.
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },
  // One title per screen without a `head()` in every route: the trail already knows where
  // one is. A tab with "Jogos Estudantis" on all of them cannot be told from another.
  head: ({ matches }) => {
    const title = breadcrumbTitle(buildBreadcrumbs(matches))

    return {
      meta: [
        { title: [title, m.common_site_title()].filter(Boolean).join(' | ') },
        // Restricted area outside the index (`frontend.md` §9.7).
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    }
  },
  component: RouteComponent,
})

/** The target of "pular para o conteúdo", and the `id` of the `<main>` that `SidebarInset` renders. */
const MAIN_ID = 'conteudo'

function RouteComponent(): React.JSX.Element {
  const tablet = useIsBelow(TABLET_BREAKPOINT)

  return (
    // `h-svh` over the component's `min-h-svh`: with a minimum height the container
    // grows with the content, and a height that grows limits no one -
    // the screens' `PageShell` would never manage to pin the footer. A fixed height
    // gives the ceiling, and what scrolls becomes each screen's inner area.
    <SidebarProvider collapsed={tablet} className="h-svh overflow-hidden">
      {/*
        The dashboard sidebar opens with nine destinations, and they come before the
        content on every screen, on every navigation.

        `sr-only` with `focus:not-sr-only`, and not `display: none`: truly hidden the link
        would not receive focus and would cease to exist for whoever it serves.
      */}
      <a
        href={'#'.concat(MAIN_ID)}
        className="sr-only rounded-md bg-background px-4 py-2 font-medium text-foreground no-underline focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-tooltip"
      >
        {m.panel_skip_to_content()}
      </a>

      <Sidebar />

      {/* `tabIndex={-1}` so the jump target can receive focus: without it the
          browser scrolls here and leaves focus on the link, and the next tab
          goes back to the top of the sidebar. */}
      {/*
        `min-w-0` is the horizontal pair of `min-h-0`, and is needed for the same
        reason: `SidebarInset` is an item of an inline flex, and a flex item does not
        shrink below its own content by default. A wide table
        pushed the whole area beyond the screen - and since the `SidebarProvider`
        above is `overflow-hidden`, what went past the end was **clipped**, not
        scrollable. The table's last column, which is the actions menu's, is
        exactly the one that lives on that edge.
      */}
      <SidebarInset id={MAIN_ID} tabIndex={-1} className="min-h-0 min-w-0">
        <Header />

        {/*
          The provider lives here, and not in each form: the upload happens when the
          file is chosen and the form only knows the `id` after it exists, so
          **every** save button on the dashboard needs to know whether a file is in flight. One per screen would be
          seven chances to forget on an eighth - and the failure is silent, because
          `useRegisterUpload` outside the provider does nothing and the record is born without
          an image, with no error at all.
        */}
        <UploadingProvider>
          {/*
            `min-h-0` is what lets the screens' `PageShell` pin the
            footer: without it a flex child does not shrink below its own
            content, the inner scroll area never gets a bounded height, and
            the scroll leaks to the whole page.

            `overflow-auto` is the pair of the fixed height above: the screens that do **not**
            use `PageShell` - forms, dashboard home - go back to scrolling
            entirely instead of having their content clipped.
          */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
            {/*
              A query error that escapes a screen (`useSuspenseQuery`) lands
              here, and not at the router boundary: the dashboard stays up,
              and "Tentar de novo" clears the error held in Query's cache before
              remounting - without that the query would redo and the boundary would keep
              showing the old error (`frontend.md` §5).
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

        {/* The credit stays outside the scrolling area: always at the foot, below the
            pagination, without competing for space with the screen. */}
        <footer className="text-muted-foreground shrink-0 border-t px-4 py-2 text-xs [&_a]:text-foreground">
          <MaiyuCredit />
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
