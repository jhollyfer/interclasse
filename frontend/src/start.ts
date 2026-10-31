/**
 * The Start configuration that holds for the whole server.
 *
 * The file is detected by name, with no registration anywhere, and exists for
 * a single reason: to open a per-request scope before anything runs inside it.
 * Request middleware runs "before every request, including server routes, SSR
 * and server functions" - which is exactly the boundary the scope needs to
 * cover, because a route's `beforeLoad` is SSR and does not go through any
 * server function.
 */

import { createMiddleware, createStart } from '@tanstack/react-start'

import { runInRequestScope } from '#/integrations/tanstack-query/http.server'

/**
 * `http.server.ts` is server-only by its suffix, so the `node:async_hooks` it
 * imports never enters the browser bundle. This file also only runs
 * on the server, and so it can import it directly.
 */
const requestScope = createMiddleware({ type: 'request' }).server(({ next }) =>
  runInRequestScope(next),
)

export const startInstance = createStart(() => ({
  requestMiddleware: [requestScope],
}))
