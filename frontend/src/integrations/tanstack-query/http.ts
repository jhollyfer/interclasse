/**
 * The frontend mirror of the backend's `HTTPException`: the same body, the
 * same statuses, the same `code`s.
 *
 * It exists because `fetch` only rejects on network failure - 401, 422 and 500 arrive
 * as a resolved promise. Without going through `request`, a `mutationFn` treats
 * "wrong password" as success and the hook's `onError` is never called.
 */

import type { z } from '@interclasse/shared'
import { createIsomorphicFn } from '@tanstack/react-start'

import { env } from '#/env'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

import * as server from './http.server'

/**
 * The error body that every API route returns. Mirrors
 * `HTTPExceptionPayload` in `backend/app/exceptions/http.exception.ts`.
 *
 * `errors` is `Record<string, string>` and not `Record<string, Array<string>>`: the
 * backend handler keeps **the first** message of each field, and not
 * the list. Treating it as an array here would make the screen print `[object Object]`.
 */
export type IHTTPErrorBody = {
  message: string
  status: number
  code: string
  errors?: Record<string, string>
}

/**
 * HTTP statuses the frontend distinguishes. It is not the backend's whole list - it is
 * what changes the UI's behavior. The rest falls into the range (`>= 500`).
 */
export const HTTPStatus = {
  /** There was no response: DNS, CORS, backend down, aborted request. */
  NETWORK: 0,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

/**
 * The `code`s that change what the screen does, per `backend/openapi.json`.
 * Compare by `code` and not by message: the message is UI text and changes.
 *
 * It is not the backend's whole list, on purpose: the `*_LIST_ERROR`,
 * `*_SHOW_ERROR` and company are 500s named after a route, and whoever handles them is the
 * `isServerError` range, not an `if` per resource.
 */
export const HTTPErrorCode = {
  /** Sign-in 401: wrong e-mail or password. Does **not** deserve a refresh. */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  /**
   * Missing or expired session, coming from the guard
   * (`backend/app/guards/cookie-access-tokens.guard.ts`). It is the only 401 that
   * deserves a refresh: sign-in's `INVALID_CREDENTIALS` is also a 401, and
   * renewing a token because of a wrong password would be one request too many by mistake.
   */
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Role middleware 403: has a session, lacks the required role. */
  ACCESS_DENIED: 'ACCESS_DENIED',
  /** `PUT /account` 422: the current password does not match. */
  CURRENT_PASSWORD_INVALID: 'CURRENT_PASSWORD_INVALID',
  /** `DELETE /administrator/users/:id` 403: nobody deletes themselves. */
  SELF_DELETE_FORBIDDEN: 'SELF_DELETE_FORBIDDEN',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  /**
   * `DELETE /storages/:id` 409: someone references the file. It is what lets the
   * image field delete the orphan without breaking another record's image.
   */
  STORAGE_IN_USE: 'STORAGE_IN_USE',
  /** `POST /storages/:id/complete` 422: the object in the bucket does not match. */
  STORAGE_SIZE_MISMATCH: 'STORAGE_SIZE_MISMATCH',
  /** Local, does not come from the server: normalized network failure. */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Local: error response without a valid JSON body (proxy, error HTML). */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  /** Local: the success body does not match the `*Response` schema from `shared/`. */
  INVALID_RESPONSE: 'INVALID_RESPONSE',
} as const

export class HTTPError extends Error {
  readonly status: number
  readonly code: string
  readonly errors?: Record<string, string>

  constructor(body: IHTTPErrorBody) {
    super(body.message)
    this.name = 'HTTPError'
    this.status = body.status
    this.code = body.code
    this.errors = body.errors
  }

  /** An error attributable to payload fields - 422 with `errors` filled in. */
  get isFieldError(): boolean {
    return Boolean(this.errors && Object.keys(this.errors).length > 0)
  }

  /** The server's or the network's fault: 5xx and the synthetic status 0. */
  get isServerError(): boolean {
    return this.status >= 500 || this.status === HTTPStatus.NETWORK
  }
}

/**
 * The API's **public** root: the address that the browser of whoever visits can reach.
 *
 * Exported because not everything that points at it goes through `request()`: the `href`
 * of a download (`GET /storages/:id/download`, which requires a session and gets it from
 * the same-site cookie) and an image's `src` are the browser fetching directly,
 * with no `fetch` in between.
 *
 * **These uses need the public address even when the value is built in
 * SSR**, because what comes out is HTML that the browser will follow later. That is why
 * they stay in this constant and not in `baseUrl()` below: an `href` with the
 * internal address would be rendered on the server and give a dead link on the client.
 */
export const BASE_URL = env.VITE_API_URL

/**
 * The API root **for whoever is making the request right now**, which is not the same
 * on both sides.
 *
 * `VITE_API_URL` is embedded in the bundle and serves the browser. But in SSR whoever
 * calls the API is Nitro, and forcing it to use the public address makes the request
 * go out to the internet and come back - through DNS, TLS and the edge proxy -
 * to reach a service that is almost always on the same network. In production that
 * is most of the time of a first navigation.
 *
 * `SERVER_API_URL` is the way out: without the `VITE_` prefix on purpose, so it never
 * enters the browser bundle. When absent, everything proceeds as before - the server
 * uses the public address, which is the behavior this file has always had.
 *
 * **`process.env` is read inside `.server()`, and not at module scope.** In an edge
 * runtime the variables are injected per request, and a `const` at the top of the file
 * runs before the environment exists and freezes `undefined` - the kind of
 * failure that only shows up in production. See the environment variables section
 * in `_doc-lib/tanstack-start.md`.
 *
 * `createIsomorphicFn` and not `typeof window`: the server branch disappears from the
 * client bundle together with what it imports.
 */
const baseUrl = createIsomorphicFn()
  .client((): string => BASE_URL)
  .server((): string => process.env.SERVER_API_URL ?? BASE_URL)

/**
 * In the browser there is nothing to do: `credentials: 'include'` already carries the
 * cookie both ways, and the specification forbids building the `Cookie` header by hand. On the SSR
 * server, whoever holds the cookie is the browser - one layer above - and forwarding is
 * mandatory. See `http.server.ts`.
 */
const inboundCookie = createIsomorphicFn()
  .client((): string | undefined => undefined)
  .server(server.inboundCookie)

const applySetCookie = createIsomorphicFn()
  .client((cookie: string | undefined, _response: Response) => cookie)
  .server(server.applySetCookie)

/**
 * An API request's deadline, in milliseconds.
 *
 * There was no deadline at all: the only `signal` that reached `fetch` was TanStack Query's,
 * and it aborts when the component **unmounts**, not when time passes. Without a cap, a
 * server that accepts the connection and does not answer leaves the promise hanging until
 * the operating system's limit, which in Node is on the order of minutes.
 *
 * In the browser that is a frozen screen. In SSR it is worse: `beforeLoad` and `loader`
 * run inside Nitro's request cycle, so the whole HTML response
 * stays stuck waiting - and whoever visits gets a spinning tab, with nothing.
 *
 * 15s is generous on purpose. This number does not exist to squeeze the common case,
 * but for the pathology; what sets the normal pace is the `retry` in
 * `query-context.ts`.
 */
const TIMEOUT = 15_000

/**
 * The caller's `signal` added to the deadline. The first one to abort wins.
 *
 * `AbortSignal.any` and not an `AbortController` by hand: the two reasons for aborting are
 * independent - the component unmounted, or time ran out - and either of them
 * has to hold. Choosing only one would lose the other.
 *
 * The `AbortSignal.timeout` timer does not keep the process alive and is collected together
 * with the signal, so there is nothing to clean up here.
 */
function deadline(signal?: AbortSignal | null): AbortSignal {
  const timeout = AbortSignal.timeout(TIMEOUT)

  if (!signal) return timeout

  return AbortSignal.any([signal, timeout])
}

/**
 * The error body as it arrived, field by field: whatever does not have the expected type
 * is left out and falls into `perform`'s fallback. Proxy and error HTML do not follow
 * the API envelope, and `.json()` returns whatever comes.
 */
function errorBody(value: unknown): Partial<IHTTPErrorBody> {
  if (typeof value !== 'object' || value === null) return {}

  const body: Partial<IHTTPErrorBody> = {}

  if ('message' in value && typeof value.message === 'string')
    body.message = value.message
  if ('status' in value && typeof value.status === 'number')
    body.status = value.status
  if ('code' in value && typeof value.code === 'string') body.code = value.code
  if (
    'errors' in value &&
    typeof value.errors === 'object' &&
    value.errors !== null
  ) {
    body.errors = Object.fromEntries(
      Object.entries(value.errors).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    )
  }

  return body
}

/** What `request` uses internally and no outside caller needs to pass. */
type RequestRetry = {
  /** Cookie to use in place of the incoming one: the result of a refresh in SSR. */
  cookie?: string
  /** Refresh lock, so the refresh itself and the replay do not fire another. */
  skipRefresh?: boolean
  /** Receives the updated `Cookie` header when the response carries `Set-Cookie`. */
  onSetCookie?: (cookie: string | undefined) => void
}

/**
 * One renewal at a time. The backend rotates: `refresh.use-case.ts` deletes the old
 * refresh token when issuing the new one, so five queries that take a 401
 * together and fire five refreshes would spend the same token five times, and
 * four of them would take the session away.
 *
 * "At a time" needs an owner, and the owner is different on each side. In the browser
 * it is the process: one user, one tab, and the module variable below suffices. On the
 * SSR server the module is shared by every visitor served at the
 * same time, and there the owner is the **request** - the scope that
 * `runInRequestScope` opens in `http.server.ts`, from the middleware in
 * `src/start.ts`.
 *
 * `createIsomorphicFn` is what delivers the right version to each side, and the server
 * branch disappears from the client bundle together with its import.
 */
let clientRenewal: Promise<string | undefined> | null = null

const pendingRenewal = createIsomorphicFn()
  .client((): Promise<string | undefined> | null => clientRenewal)
  .server(() => server.requestScope()?.renewal ?? null)

const setPendingRenewal = createIsomorphicFn()
  .client((pending: Promise<string | undefined> | null) => {
    clientRenewal = pending
  })
  .server((pending: Promise<string | undefined> | null) => {
    const scope = server.requestScope()
    // Outside a request cycle - test, script - there is no open scope, and
    // the renewal is simply not shared. Deduplicating is an optimization,
    // not correctness: each call still renews on its own.
    if (scope) scope.renewal = pending
  })

async function renew(cookie: string | undefined): Promise<string | undefined> {
  let pending = pendingRenewal()

  if (!pending) {
    pending = refresh(cookie)
    setPendingRenewal(pending)
  }

  try {
    return await pending
  } finally {
    if (pendingRenewal() === pending) setPendingRenewal(null)
  }
}

async function refresh(
  cookie: string | undefined,
): Promise<string | undefined> {
  let renewed: string | undefined

  await send(
    '/authentication/refresh',
    { method: 'POST' },
    {
      cookie,
      skipRefresh: true,
      onSetCookie: (next) => {
        renewed = next
      },
    },
  )

  return renewed
}

/**
 * `fetch` with two extra guarantees: an error response becomes an exception, and an
 * expired session is renewed without the screen noticing. Every failure path - network,
 * unreadable body, API error - leaves here as an `HTTPError` with `status`
 * filled in, so whoever handles it never needs `instanceof`.
 *
 * There is no token in `localStorage`, `sessionStorage` or `document.cookie`: the
 * backend's two cookies are `httpOnly` and signed, and the page's JavaScript
 * neither reads nor writes them. Who is logged in is discovered by asking the API.
 *
 * Returns the already approved response; reading (or not) the body is up to `request` and `send`.
 */
async function perform(
  path: string,
  init?: RequestInit,
  retry?: RequestRetry,
): Promise<Response> {
  const cookie = retry?.cookie ?? inboundCookie()

  /**
   * `FormData` builds its own `Content-Type`, with the `boundary` that separates the
   * parts. Declaring `application/json` on top would make the server look for the
   * boundary in a header that does not have it, and the body would arrive empty.
   *
   * Here and not in every caller: no Cycle 1 route sends `FormData` - the
   * binary goes from the browser straight to the bucket -, and a forgotten `Content-Type`
   * in a future upload would fail the same way.
   */
  // The screen's language goes along (_standards/i18n.md §2): the API answers the
  // error message and the 422 in it. `Accept-Language` is a header on CORS's safe
  // list, so it does not trigger a preflight. In SSR, `getLocale()` reads the language
  // of the request that Paraglide's middleware opened.
  const headers: Record<string, string> = { 'Accept-Language': getLocale() }
  //
  // `init?.body &&` in front: without a body there is no content type to declare, and
  // a `Content-Type: application/json` on a GET is a header that describes
  // nothing. Worse than useless - it is what stops a simple GET from being a simple
  // CORS request and makes it require a preflight, that is an extra `OPTIONS` before
  // each read.
  if (init?.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  let response: Response

  try {
    response = await fetch(baseUrl().concat(path), {
      ...init,
      // Sign-in answers 204 and returns the tokens in cookies
      // (`app/services/cookie.ts`). Without this login "works" and does not authenticate.
      credentials: 'include',
      // After the spread of `init`, otherwise the caller's `signal` would overwrite
      // the deadline and the request would again have no cap.
      signal: deadline(init?.signal),
      headers: {
        ...headers,
        ...(cookie && { cookie }),
        ...init?.headers,
      },
    })
  } catch {
    // `fetch` only rejects here: no response, hence no real status.
    throw new HTTPError({
      message: m.common_error_network(),
      status: HTTPStatus.NETWORK,
      code: HTTPErrorCode.NETWORK_ERROR,
    })
  }

  // Outside the callback's `?.` on purpose: optional chaining does not evaluate
  // the argument when the callback does not exist, and forwarding `Set-Cookie` to the
  // browser holds for every response, not only the refresh's.
  const renewedCookie = applySetCookie(cookie, response)
  retry?.onSetCookie?.(renewedCookie)

  if (!response.ok) {
    // An unreadable body (proxy HTML, empty response) becomes an HTTPError with the
    // real status all the same - the UI never receives an error without `status`.
    let body: Partial<IHTTPErrorBody> | null = null

    try {
      body = errorBody(await response.json())
    } catch {
      body = null
    }

    if (
      response.status === HTTPStatus.UNAUTHORIZED &&
      body?.code === HTTPErrorCode.AUTHENTICATION_REQUIRED &&
      !retry?.skipRefresh
    ) {
      // If the refresh fails too, its `HTTPError` bubbles up from here and the route's guard
      // treats it as unauthenticated - which is exactly what it is.
      const renewed = await renew(cookie)
      return await perform(path, init, {
        cookie: renewed,
        skipRefresh: true,
      })
    }

    throw new HTTPError({
      message: body?.message ?? m.common_error_unknown(),
      status: body?.status ?? response.status,
      code: body?.code ?? HTTPErrorCode.UNKNOWN_ERROR,
      errors: body?.errors,
    })
  }

  return response
}

/**
 * A request that returns a record: the `unknown` body becomes a type here, and only
 * here, through `@interclasse/shared`'s `*Response` schema (`frontend.md` §3.3).
 * A body outside the contract is a server failure (`BAD_GATEWAY`), never a
 * crooked datum that blows up on screen.
 */
export async function request<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: RequestInit,
  retry?: RequestRetry,
): Promise<z.infer<TSchema>> {
  const response = await perform(path, init, retry)

  // Whoever asks for a record and receives 204 is calling the wrong route - and `.json()`
  // would blow up with a `SyntaxError`, outside the contract of always `HTTPError`.
  if (response.status === HTTPStatus.NO_CONTENT) {
    throw new HTTPError({
      message: m.common_error_empty_response(),
      status: response.status,
      code: HTTPErrorCode.UNKNOWN_ERROR,
    })
  }

  const parsed = schema.safeParse(await response.json())

  if (!parsed.success) {
    throw new HTTPError({
      message: m.common_error_unknown(),
      status: HTTPStatus.BAD_GATEWAY,
      code: HTTPErrorCode.INVALID_RESPONSE,
    })
  }

  return parsed.data
}

/**
 * A request with no return: sign-in, sign-out, archive, delete and purge.
 * They answer 204, and the body is never read - `.json()` would blow up on an empty body.
 */
export async function send(
  path: string,
  init?: RequestInit,
  retry?: RequestRetry,
): Promise<void> {
  await perform(path, init, retry)
}
