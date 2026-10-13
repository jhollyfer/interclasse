import { afterEach, expect, test, vi } from 'vitest'
import { HTTPError, HTTPErrorCode, HTTPStatus, request } from './http'
import { runInRequestScope } from './http.server'

/**
 * Responde 401 com o `code` do guard em toda rota privada, e 204 no refresh,
 * contando quantas vezes o refresh foi chamado.
 *
 * O 401 do replay é de propósito: o que está sendo medido é quantas renovações
 * saem, não se a segunda tentativa passa.
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
        code: HTTPErrorCode.UNAUTHORIZED,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  })

  return refreshes
}

function respond(status: number, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

/** Captura a rejeição já tipada - `.catch((e) => e)` devolveria `unknown`. */
async function rejection(promise: Promise<unknown>): Promise<HTTPError> {
  try {
    await promise
  } catch (error) {
    return error as HTTPError
  }

  throw new Error('esperava rejeição, a promessa resolveu')
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('toda requisição leva o cookie da sessão', async () => {
  const fetcher = respond(200, { id: '1' })

  await request('/account')

  // O cookie é `httpOnly` e assinado: o JavaScript não o lê nem o escreve, e
  // sem `credentials: 'include'` ele simplesmente não sai do navegador - o
  // login "funciona" e nenhuma tela seguinte autentica.
  const init = fetcher.mock.calls[0]?.[1]
  expect(init?.credentials).toBe('include')
})

test('204 resolve sem tentar ler corpo vazio', async () => {
  respond(204)

  await expect(request('/authentication/sign-in')).resolves.toBeUndefined()
})

test('422 vira erro de campo', async () => {
  respond(422, {
    message: 'Dados inválidos',
    status: 422,
    code: HTTPErrorCode.VALIDATION_ERROR,
    // Uma mensagem por campo, e não um array: é o que o handler do backend
    // monta em `app/exceptions/handler.ts`.
    errors: { email: 'O campo email deve ser um e-mail válido' },
  })

  const error = await rejection(request('/authentication/sign-in'))

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

  const error = await rejection(request('/authentication/sign-in'))

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

  await rejection(request('/authentication/sign-in'))

  // Senha errada e sessão expirada são os dois 401 do backend, e só o segundo
  // tem token a renovar. Renovar aqui seria um pedido a mais por engano.
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

  const error = await rejection(request('/administrator/testimonials'))

  expect(error.isServerError).toBe(true)
})

test('corpo ilegível mantém o status real da resposta', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('<html>502 Bad Gateway</html>', { status: 502 }),
  )

  const error = await rejection(request('/account'))

  expect(error.status).toBe(502)
  expect(error.code).toBe(HTTPErrorCode.UNKNOWN_ERROR)
  expect(error.isServerError).toBe(true)
})

test('falha de rede vira HTTPError com status sintético', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(
    new TypeError('Failed to fetch'),
  )

  const error = await rejection(request('/account'))

  expect(error).toBeInstanceOf(HTTPError)
  expect(error.status).toBe(HTTPStatus.NETWORK)
  expect(error.isServerError).toBe(true)
})

test('401 do guard renova a sessão e repete a requisição uma vez só', async () => {
  const refreshes = respondExpired()

  await runInRequestScope(() => rejection(request('/account')))

  expect(refreshes).toHaveLength(1)

  // Duas idas a `/account`: a original e o replay. A terceira não existe porque
  // o replay carrega `skipRefresh`, e é ela que separa "renovar" de "renovar
  // para sempre".
  const calls = vi
    .mocked(globalThis.fetch)
    .mock.calls.filter(([input]) => String(input).includes('/account'))

  expect(calls).toHaveLength(2)
})

test('no mesmo escopo, cinco 401 simultâneos renovam uma vez só', async () => {
  const refreshes = respondExpired()

  await runInRequestScope(async () => {
    const pending = Array.from({ length: 5 }, () =>
      rejection(request('/account')),
    )

    await Promise.all(pending)
  })

  // O backend apaga o refresh token antigo ao emitir o novo: cinco renovações
  // gastariam o mesmo token cinco vezes, e quatro derrubariam a sessão.
  expect(refreshes).toHaveLength(1)
})

test('escopos diferentes renovam cada um por conta própria', async () => {
  const refreshes = respondExpired()

  // São dois visitantes, com cookies diferentes. Compartilhar a renovação entre
  // eles daria a um o token do outro.
  await Promise.all([
    runInRequestScope(() => rejection(request('/account'))),
    runInRequestScope(() => rejection(request('/account'))),
  ])

  expect(refreshes).toHaveLength(2)
})

test('FormData monta o próprio Content-Type', async () => {
  const fetcher = respond(201, { id: '1' })

  await request('/storages', { method: 'POST', body: new FormData() })

  // Declarar `application/json` por cima faria o servidor procurar o `boundary`
  // num cabeçalho que não o tem, e o corpo chegaria vazio.
  const init = fetcher.mock.calls[0]?.[1]
  const headers = init?.headers as Record<string, string>
  expect(headers['Content-Type']).toBeUndefined()
})

test('corpo de objeto continua declarando JSON', async () => {
  const fetcher = respond(201, { id: '1' })

  await request('/administrator/testimonials', {
    method: 'POST',
    body: JSON.stringify({ name: 'Maria' }),
  })

  const init = fetcher.mock.calls[0]?.[1]
  const headers = init?.headers as Record<string, string>
  expect(headers['Content-Type']).toBe('application/json')
})

test('o signal do queryFn chega ao fetch', async () => {
  const fetcher = respond(200, { id: '1' })
  const controller = new AbortController()

  await request('/account', { signal: controller.signal })

  // O `signal` vem de graça no `RequestInit`, mas só se `request` não o perder
  // ao montar as próprias opções - que é o que este teste tranca. Sem ele,
  // query que desmonta antes de resolver não cancela nada.
  //
  // O objeto não é o do chamador: `request` o combina com o prazo de `TIMEOUT`
  // por `AbortSignal.any`. O que precisa continuar valendo é o efeito, e é o
  // efeito que se afere - comparar identidade trancaria a implementação, não o
  // comportamento.
  const init = fetcher.mock.calls[0]?.[1]
  expect(init?.signal?.aborted).toBe(false)

  controller.abort()
  expect(init?.signal?.aborted).toBe(true)
})

test('a requisição tem prazo mesmo sem signal do chamador', async () => {
  const fetcher = respond(200, { id: '1' })

  await request('/account')

  // Sem prazo, um servidor que aceita a conexão e não responde deixa a promessa
  // pendurada até o limite do sistema operacional - e no SSR isso prende a
  // resposta HTML inteira. O `signal` existe mesmo quando ninguém passou um.
  const init = fetcher.mock.calls[0]?.[1]
  expect(init?.signal).toBeInstanceOf(AbortSignal)
  expect(init?.signal?.aborted).toBe(false)
})

test('o signal sobrevive ao replay depois do refresh', async () => {
  respondExpired()
  const controller = new AbortController()

  await runInRequestScope(() =>
    rejection(request('/account', { signal: controller.signal })),
  )

  // O replay reusa o `init` original. Perder o signal aqui deixaria a segunda
  // tentativa rodando depois de a tela já ter desmontado.
  const replay = vi
    .mocked(globalThis.fetch)
    .mock.calls.filter(([input]) => String(input).includes('/account'))

  expect(replay).toHaveLength(2)

  // Idem o teste acima: cada tentativa recebe o signal do chamador combinado com
  // o próprio prazo, então o que se afere é o efeito. As duas precisam abortar
  // juntas - um replay que sobrevivesse ao desmonte é exatamente o vazamento
  // que este teste existe para pegar.
  for (const [, init] of replay) expect(init?.signal?.aborted).toBe(false)

  controller.abort()

  for (const [, init] of replay) expect(init?.signal?.aborted).toBe(true)
})
