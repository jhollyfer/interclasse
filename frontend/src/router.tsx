import * as shared from '@interclasse/shared'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { createIsomorphicFn } from '@tanstack/react-start'

import {
  NotFoundPage,
  NotFoundPageActions,
  NotFoundPageDescription,
  NotFoundPageHomeButton,
  NotFoundPageServerError,
  NotFoundPageTitle,
} from '#/components/common/not-found-page'
import { HTTPError } from '#/integrations/tanstack-query/http'
import { m } from '#/paraglide/messages'

import { getContext } from './integrations/tanstack-query/query-context'
import { deLocalizeUrl, getLocale, localizeUrl } from './paraglide/runtime'
import { routeTree } from './routeTree.gen'

/**
 * Zod's validation messages come out in the screen's language. Only the client
 * validates forms; on the server the global Zod configuration would be shared
 * between requests in different languages. `shared.` and not the bare name: the
 * function is not a hook, and the contract's `use` prefix would trigger the rule.
 * _doc-lib/tanstack-start.md#guide/environment-functions.
 */
const applyValidatorLocale = createIsomorphicFn()
  .client(() => shared.useValidatorLocale(getLocale()))
  .server(() => undefined)

export function getRouter() {
  applyValidatorLocale()

  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    // The route tree is a single one: `/es/matches` comes in as `/matches` and goes out with the
    // current language's prefix (_doc-lib/tanstack-router.md#guide/url-rewrites).
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => <NotFoundPage />,

    /*
     * The exit for everything that fails and was not handled.
     *
     * A route without `errorComponent` and a router without a default fall to
     * TanStack's built-in screen, which in production is an unstyled block of
     * text. Having a designed 404 and no error screen is the usual imbalance: a
     * network failure in a `loader` is far more frequent than a mistyped URL.
     *
     * `reset` before "back to the start": almost every error here is a
     * `loader` that did not answer, and retrying fixes it without losing one's
     * place. The path home stays as the second exit, not the only one.
     */
    defaultErrorComponent: ({ error, reset }) => {
      /*
       * A `loader` 4xx carries a message written for whoever reads the screen -
       * "Esta notícia foi arquivada", "Evento não encontrado" -, and showing it is
       * what separates "the failure is ours" from "this is the situation". Without it,
       * a news item archived by the editor received "Algo quebrou aqui, a falha é nossa"
       * and the reader was left not knowing what to do.
       *
       * 4xx only: a 5xx message is from the server to the log, and repeating it on
       * screen helps nobody and can leak implementation detail.
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
              {m.common_error_link_moved()}
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
