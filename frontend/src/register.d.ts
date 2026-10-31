import type { HTTPError } from '#/integrations/tanstack-query/http'
import type { getRouter } from '#/router'

/**
 * The libraries' type registrations, in a `.d.ts` because declaration merging
 * requires `interface` (the lint allows that form only in `.d.ts` files).
 */

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

/**
 * Every failure path of `request` throws `HTTPError`, so a mutation's `onError`
 * and a query's `error` arrive with `.status`, `.code` and `.errors` without
 * `instanceof` on each screen. It is a compile-time promise: a throw that does
 * not come from `request` (a bug, a `TypeError`) arrives anyway, and that is why
 * the `retry` in `query-context.ts` keeps the `instanceof`.
 */
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: HTTPError
  }
}
