/**
 * The parts of `request` that only exist on the SSR server.
 *
 * With SSR, the first navigation is rendered by Nitro, and it is Nitro - not the
 * browser - that talks to AdonisJS. `fetch`'s `credentials: 'include'` does not
 * help there: the browser holds the cookie, and it stayed one layer above. Without
 * the forwarding done here, every `beforeLoad` rendered on the server would see 401.
 *
 * This module imports `@tanstack/react-start/server` and therefore can never
 * enter the browser bundle. Whoever consumes it is the `.server()` of a
 * `createIsomorphicFn` in `http.ts`, and the Start plugin strips both the call and
 * this import from the client build.
 */

import {
  appendResponseHeader,
  getRequestHeader,
} from '@tanstack/react-start/server'
import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * What needs to hold per request, and not per process.
 *
 * Today only the token renewal lives here. It needs this scope because the
 * backend **rotates**: `refresh.use-case.ts` deletes the old refresh token when
 * issuing the new one. A renewal promise kept at module level would be
 * shared by every visitor the SSR server serves at the same time,
 * and the second request to reuse it would end up holding a cookie that
 * the backend already invalidated.
 *
 * It is the same rule that makes the `QueryClient` be born per request in
 * `query-context.ts` - on the server, module scope is everyone's scope.
 */
export type RequestScope = {
  renewal: Promise<string | undefined> | null
}

const storage = new AsyncLocalStorage<RequestScope>()

/**
 * Opens a scope and runs `fn` inside it. The caller is the request middleware
 * registered in `src/start.ts`, which Start runs before every request -
 * SSR, server route and server function.
 */
export function runInRequestScope<T>(fn: () => T): T {
  return storage.run({ renewal: null }, fn)
}

/**
 * The scope of the request in progress, or `undefined` outside one - test, script,
 * any code that runs without the middleware having opened the scope.
 */
export function requestScope(): RequestScope | undefined {
  return storage.getStore()
}

/**
 * The `Cookie` header the browser sent to Nitro, to be forwarded verbatim
 * to AdonisJS.
 *
 * Verbatim is a requirement, not a preference: AdonisJS's `response.cookie()` signs
 * the value (`s:<base64>.<hmac>` verified with the `APP_KEY`), so reading, reassembling
 * or reinterpreting any part of it invalidates the signature.
 */
export function inboundCookie(): string | undefined {
  try {
    return getRequestHeader('cookie')
  } catch {
    // Outside a request cycle - test, script - there is no cookie to forward.
    return undefined
  }
}

/**
 * Copies the `Set-Cookie`s that AdonisJS returned into the response Nitro will
 * send to the browser, and returns the already updated `Cookie` header.
 *
 * The return value is what makes the replay after a refresh use the new cookie. The
 * backend deletes the old refresh token on rotation (`refresh.use-case.ts`),
 * so repeating the request with the incoming cookie would spend a token that
 * just ceased to exist, and would take down the freshly created session.
 */
export function applySetCookie(
  cookie: string | undefined,
  response: Response,
): string | undefined {
  const values = response.headers.getSetCookie()

  if (!values.length) return cookie

  try {
    // Start's primitive for forwarding raw `Set-Cookie` from another server:
    // it appends without replacing what is already in the response.
    appendResponseHeader('set-cookie', values)
  } catch {
    // same as `inboundCookie`: without a request in progress, there is nowhere to write.
  }

  return mergeCookieHeader(cookie, values)
}

/**
 * Applies to a `Cookie` header the `name=value` pairs of a list of
 * `Set-Cookie`: replaces what already exists, appends what does not.
 *
 * Exported for testing - it is the only logic in this file that is not a direct
 * call to Start.
 */
export function mergeCookieHeader(
  cookie: string | undefined,
  setCookies: ReadonlyArray<string>,
): string {
  const pairs = new Map<string, string>()

  for (const entry of cookie?.split(';') ?? []) {
    const separator = entry.indexOf('=')
    if (separator < 0) continue
    pairs.set(entry.slice(0, separator).trim(), entry.slice(separator + 1))
  }

  for (const value of setCookies) {
    // The pair comes before the first `;`. The rest are attributes (`Path`,
    // `HttpOnly`, `Max-Age`) that do not exist in the `Cookie` header.
    const [pair = ''] = value.split(';')
    const separator = pair.indexOf('=')
    if (separator < 0) continue
    pairs.set(pair.slice(0, separator).trim(), pair.slice(separator + 1))
  }

  return Array.from(pairs, ([name, value]) => `${name}=${value}`).join('; ')
}
