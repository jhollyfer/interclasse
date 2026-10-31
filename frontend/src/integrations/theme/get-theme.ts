/**
 * The part of `lib/theme.ts` that only exists on the server: reading the request's
 * cookie. It imports `@tanstack/react-start/server` and therefore never enters the
 * browser bundle; the consumer is the `.server()` of a
 * `createIsomorphicFn` (same design as `http.server.ts`).
 */

import { getCookie } from '@tanstack/react-start/server'

/** The raw value of the theme cookie; `undefined` outside a request. */
export function getThemeCookie(name: string): string | undefined {
  try {
    return getCookie(name)
  } catch {
    // Outside a request cycle - test, script - there is no cookie.
    return undefined
  }
}
