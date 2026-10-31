import { QueryClient } from '@tanstack/react-query'

import { HTTPError } from './http'

/** How many times a query that failed because of server or network is retried. */
const MAX_QUERY_RETRIES = 3

/**
 * The queries' default `retry`: retries 5xx and network failure, and never 4xx.
 *
 * 401, 403, 404 and 422 do not change their answer on the third attempt - they only delay
 * the error message on screen. The `instanceof` stays even with
 * `Register.defaultError` declared in `register.d.ts`: that is a compile-time
 * promise, and a throw that does not come from `request` (a bug, a `TypeError`)
 * arrives anyway.
 */
export function shouldRetryQuery(failures: number, error: unknown): boolean {
  if (error instanceof HTTPError && !error.isServerError) return false

  return failures < MAX_QUERY_RETRIES
}

/**
 * The `QueryClient` that goes into the router context.
 *
 * This file does **not** provide anything - whoever mounts the `QueryClientProvider` is
 * `src/router.tsx`'s `setupRouterSsrQueryIntegration`, which wraps the router's own
 * `Wrap`. Adding a provider by hand here would create a second
 * client, that is two caches, and the sidebar's `useQuery` would read what the
 * `beforeLoad` did not fill.
 *
 * One `QueryClient` per request, and never a module singleton: on the SSR server
 * the module is shared by every visitor, and a module cache would hand one
 * user's `/account` rendered to the next.
 * `getContext` runs inside `getRouter`, which Start calls on every
 * request, so the isolation comes from there.
 */
export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // With the default `0` all data that came ready from the server is born stale and
        // is redone as soon as the page hydrates - the first load pays for the
        // request twice. One minute is short enough not to hold obsolete
        // data and long enough to cover hydration.
        //
        // Whoever needs another value declares its own: `accountQueryOptions` uses
        // five minutes.
        //
        // **The cap is not arbitrary: it is the backend's `URL_TTL`**, today fifteen
        // minutes (`config/drive.ts`). The response carries a signed `url`, and the
        // cache keeps it along - a `staleTime` above that deadline serves an image
        // with an expired URL, and the failure shows up as a broken image, with no error.
        staleTime: 60 * 1000,
        retry: shouldRetryQuery,
      },
    },
  })

  return {
    queryClient,
  }
}
