import { z } from '@interclasse/shared'
import { afterEach, expect, test, vi } from 'vitest'

import { HTTPError, HTTPErrorCode, HTTPStatus, request, send } from './http'
import { runInRequestScope } from './http.server'

/** The schema that accepts everything: what is measured here is the transport, not the contract. */
const ANY = z.unknown()

/**
 * Answers 401 with the guard's `code` on every private route, and 204 on refresh,
 * counting how many times refresh was called.
 *
 * The replay's 401 is on purpose: what is being measured is how many renewals
 * go out, not whether the second attempt passes.
 */
function respondExpired() {
  const refreshes: Array<string> = []

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)

    if (url.includes('/authentication/refresh')) {
      refreshes.push(url)
      return new Response(null, { status: 204 })
    }

    return new Response(
      JSON.stringify({
        message: 'Sessão expirada',
        status: 401,
        code: HTTPErrorCode.AUTHENTICATION_REQUIRED,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  })

  return refreshes
}

function respond(status: number, body?: unknown) {
  let payload: string | null = null
  if (body !== undefined) payload = JSON.stringify(body)

  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(payload, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

/** Captures the already typed rejection - `.catch((e) => e)` would return `unknown`. */
async function rejection(promise: Promise<unknown>): Promise<HTTPError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof HTTPError) return error

    throw error
  }

  throw new Error('esperava rejeição, a promessa resolveu')
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('toda requisição leva o cookie da sessão', async () => {
  const fetcher = respond(200, { id: '1' })

  await request('/account', ANY)

  // The cookie is `httpOnly` and signed: JavaScript neither reads nor writes it, and
  // without `credentials: 'include'` it simply does not leave the browser - login
  // "works" and no following screen authenticates.
  const init = fetcher.mock.calls[0]?.[1]
  expect(init?.credentials).toBe('include')
})

test('204 resolve sem tentar ler corpo vazio', async () => {
  respond(204)

  await expect(send('/authentication/sign-in')).resolves.toBeUndefined()
})

test('204 onde se esperava registro vira HTTPError, não SyntaxError', async () => {
  respond(204)

  const error = await rejection(request('/account', ANY))
  expect(error.code).toBe(HTTPErrorCode.UNKNOWN_ERROR)
  expect(error.status).toBe(204)
})

test('422 vira erro de campo', async () => {
  respond(422, {
    message: 'Dados inválidos',
    status: 422,
    code: HTTPErrorCode.VALIDATION_ERROR,
    // One message per field, not an array: it is what the backend's handler
    // builds in `app/exceptions/handler.ts`.
    errors: { email: 'O campo email deve ser um e-mail válido' },
  })

  const error = await rejection(request('/authentication/sign-in', ANY))

  expect(error).toBeInstanceOf(HTTPError)
  expect(error.isFieldError).toBe(true)
  expect(error.isServerError).toBe(false)
  expect(error.errors).toEqual({
    email: 'O campo email deve ser um e-mail válido',
  })
})

test('401 de credencial inválida não é erro de campo nem de servidor', async () => {
  respond(401, {
    message: 'Credenciais inválidas',
    status: 401,
    code: HTTPErrorCode.INVALID_CREDENTIALS,
  })

  const error = await rejection(request('/authentication/sign-in', ANY))

  expect(error.isFieldError).toBe(false)
  expect(error.isServerError).toBe(false)
  expect(error.message).toBe('Credenciais inválidas')
})

test('401 de credencial inválida não dispara refresh', async () => {
  const fetcher = respond(401, {
    message: 'Credenciais inválidas',
    status: 401,
    code: HTTPErrorCode.INVALID_CREDENTIALS,
  })

  await rejection(request('/authentication/sign-in', ANY))

  // A wrong password and an expired session are the backend's two 401s, and only the second
  // has a token to renew. Renewing here would be one request too many by mistake.
  const refreshes = fetcher.mock.calls.filter(([input]) =>
    String(input).includes('/authentication/refresh'),
  )
  expect(refreshes).toHaveLength(0)
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('500 é erro de servidor', async () => {
  respond(500, {
    message: 'Erro interno do servidor',
    status: 500,
    code: 'TESTIMONIAL_LIST_ERROR',
  })

  const error = await rejection(request('/administrator/testimonials', ANY))

  expect(error.isServerError).toBe(true)
})

test('corpo ilegível mantém o status real da resposta', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('<html>502 Bad Gateway</html>', { status: 502 }),
  )

  const error = await rejection(request('/account', ANY))

  expect(error.status).toBe(502)
  expect(error.code).toBe(HTTPErrorCode.UNKNOWN_ERROR)
  expect(error.isServerError).toBe(true)
})

test('falha de rede vira HTTPError com status sintético', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(
    new TypeError('Failed to fetch'),
  )

  const error = await rejection(request('/account', ANY))

  expect(error).toBeInstanceOf(HTTPError)
  expect(error.status).toBe(HTTPStatus.NETWORK)
  expect(error.isServerError).toBe(true)
})

test('401 do guard renova a sessão e repete a requisição uma vez só', async () => {
  const refreshes = respondExpired()

  await runInRequestScope(() => rejection(request('/account', ANY)))

  expect(refreshes).toHaveLength(1)

  // Two trips to `/account`: the original and the replay. A third does not exist because
  // the replay carries `skipRefresh`, and that is what separates "renew" from "renew
  // forever".
  const calls = vi
    .mocked(globalThis.fetch)
    .mock.calls.filter(([input]) => String(input).includes('/account'))

  expect(calls).toHaveLength(2)
})

test('no mesmo escopo, cinco 401 simultâneos renovam uma vez só', async () => {
  const refreshes = respondExpired()

  await runInRequestScope(async () => {
    const pending = Array.from({ length: 5 }, () =>
      rejection(request('/account', ANY)),
    )

    await Promise.all(pending)
  })

  // The backend deletes the old refresh token when issuing the new one: five renewals
  // would spend the same token five times, and four would take the session down.
  expect(refreshes).toHaveLength(1)
})

test('escopos diferentes renovam cada um por conta própria', async () => {
  const refreshes = respondExpired()

  // They are two visitors, with different cookies. Sharing the renewal between
  // them would give one the other's token.
  await Promise.all([
    runInRequestScope(() => rejection(request('/account', ANY))),
    runInRequestScope(() => rejection(request('/account', ANY))),
  ])

  expect(refreshes).toHaveLength(2)
})

test('FormData monta o próprio Content-Type', async () => {
  const fetcher = respond(201, { id: '1' })

  await request('/storages', ANY, { method: 'POST', body: new FormData() })

  // Declaring `application/json` on top would make the server look for the `boundary`
  // in a header that does not have it, and the body would arrive empty.
  const init = fetcher.mock.calls[0]?.[1]
  expect(new Headers(init?.headers).get('Content-Type')).toBeNull()
})

test('corpo de objeto continua declarando JSON', async () => {
  const fetcher = respond(201, { id: '1' })

  await request('/administrator/testimonials', ANY, {
    method: 'POST',
    body: JSON.stringify({ name: 'Maria' }),
  })

  const init = fetcher.mock.calls[0]?.[1]
  expect(new Headers(init?.headers).get('Content-Type')).toBe(
    'application/json',
  )
})

test('o signal do queryFn chega ao fetch', async () => {
  const fetcher = respond(200, { id: '1' })
  const controller = new AbortController()

  await request('/account', ANY, { signal: controller.signal })

  // The `signal` comes for free in `RequestInit`, but only if `request` does not lose it
  // when building its own options - which is what this test locks. Without it,
  // a query that unmounts before resolving cancels nothing.
  //
  // The object is not the caller's: `request` combines it with the `TIMEOUT` deadline
  // through `AbortSignal.any`. What has to keep holding is the effect, and it is
  // the effect that is measured - comparing identity would lock the implementation, not the
  // behavior.
  const init = fetcher.mock.calls[0]?.[1]
  expect(init?.signal?.aborted).toBe(false)

  controller.abort()
  expect(init?.signal?.aborted).toBe(true)
})

test('a requisição tem prazo mesmo sem signal do chamador', async () => {
  const fetcher = respond(200, { id: '1' })

  await request('/account', ANY)

  // Without a deadline, a server that accepts the connection and does not answer leaves the promise
  // hanging until the operating system's limit - and in SSR that holds the whole
  // HTML response. The `signal` exists even when nobody passed one.
  const init = fetcher.mock.calls[0]?.[1]
  expect(init?.signal).toBeInstanceOf(AbortSignal)
  expect(init?.signal?.aborted).toBe(false)
})

test('o signal sobrevive ao replay depois do refresh', async () => {
  respondExpired()
  const controller = new AbortController()

  await runInRequestScope(() =>
    rejection(request('/account', ANY, { signal: controller.signal })),
  )

  // The replay reuses the original `init`. Losing the signal here would leave the second
  // attempt running after the screen has already unmounted.
  const replay = vi
    .mocked(globalThis.fetch)
    .mock.calls.filter(([input]) => String(input).includes('/account'))

  expect(replay).toHaveLength(2)

  // Same as the test above: each attempt receives the caller's signal combined with
  // its own deadline, so what is measured is the effect. Both must abort
  // together - a replay that survived the unmount is exactly the leak
  // this test exists to catch.
  for (const [, init] of replay) expect(init?.signal?.aborted).toBe(false)

  controller.abort()

  for (const [, init] of replay) expect(init?.signal?.aborted).toBe(true)
})

test('corpo de sucesso fora do schema vira HTTPError de servidor', async () => {
  respond(200, { id: 1 })

  const error = await rejection(
    request('/account', z.object({ id: z.string() })),
  )

  expect(error.status).toBe(HTTPStatus.BAD_GATEWAY)
  expect(error.code).toBe(HTTPErrorCode.INVALID_RESPONSE)
  expect(error.isServerError).toBe(true)
})

test('corpo de sucesso dentro do schema devolve o dado tipado', async () => {
  respond(200, { id: 'a' })

  await expect(
    request('/account', z.object({ id: z.string() })),
  ).resolves.toEqual({ id: 'a' })
})
