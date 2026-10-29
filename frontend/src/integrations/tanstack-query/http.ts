/**
 * O espelho no frontend do `HTTPException` do backend: o mesmo corpo, os
 * mesmos status, os mesmos `code`s.
 *
 * Existe porque `fetch` só rejeita em falha de rede - 401, 422 e 500 chegam
 * como promessa resolvida. Sem passar por `request`, um `mutationFn` trata
 * "senha errada" como sucesso e o `onError` do hook nunca é chamado.
 */

import { createIsomorphicFn } from '@tanstack/react-start'

import { env } from '#/env'
import { getLocale } from '#/paraglide/runtime'

import * as server from './http.server'

/**
 * O corpo de erro que toda rota da API devolve. Espelha
 * `HTTPExceptionPayload` em `backend/app/exceptions/http.exception.ts`.
 *
 * `errors` é `Record<string, string>` e não `Record<string, Array<string>>`: o
 * handler do backend guarda **a primeira** mensagem de cada campo, e não a
 * lista. Tratar como array aqui faria a tela imprimir `[object Object]`.
 */
export type IHTTPErrorBody = {
  message: string
  status: number
  code: string
  errors?: Record<string, string>
}

/**
 * Status HTTP que o frontend distingue. Não é a lista inteira do backend - é
 * o que muda o comportamento da UI. O resto cai na faixa (`>= 500`).
 */
export const HTTPStatus = {
  /** Não houve resposta: DNS, CORS, backend fora do ar, requisição abortada. */
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
 * Os `code`s que mudam o que a tela faz, conforme `backend/openapi.json`.
 * Comparar por `code` e não por mensagem: a mensagem é texto de UI e muda.
 *
 * Não é a lista inteira do backend, de propósito: os `*_LIST_ERROR`,
 * `*_SHOW_ERROR` e companhia são 500 com nome de rota, e quem os trata é a
 * faixa `isServerError`, não um `if` por recurso.
 */
export const HTTPErrorCode = {
  /** 401 do sign-in: e-mail ou senha errados. **Não** merece refresh. */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  /**
   * Sessão ausente ou expirada, vindo do guard
   * (`backend/app/guards/cookie-access-tokens.guard.ts`). É o único 401 que
   * merece um refresh: o `INVALID_CREDENTIALS` do sign-in também é 401, e
   * renovar token por causa de senha errada seria um pedido a mais por engano.
   */
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** 403 do middleware de papel: tem sessão, não tem o papel exigido. */
  ACCESS_DENIED: 'ACCESS_DENIED',
  /** 422 de `PUT /account`: a senha atual não confere. */
  CURRENT_PASSWORD_INVALID: 'CURRENT_PASSWORD_INVALID',
  /** 403 de `DELETE /administrator/users/:id`: ninguém apaga a si mesmo. */
  SELF_DELETE_FORBIDDEN: 'SELF_DELETE_FORBIDDEN',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  /**
   * 409 de `DELETE /storages/:id`: alguém referencia o arquivo. É o que faz o
   * campo de imagem poder apagar o órfão sem furar a imagem de outro cadastro.
   */
  STORAGE_IN_USE: 'STORAGE_IN_USE',
  /** 422 de `POST /storages/:id/complete`: o objeto no bucket não bate. */
  STORAGE_SIZE_MISMATCH: 'STORAGE_SIZE_MISMATCH',
  /** Local, não vem do servidor: falha de rede normalizada. */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Local: resposta de erro sem corpo JSON válido (proxy, HTML de erro). */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
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

  /** Erro atribuível a campos do payload - 422 com `errors` preenchido. */
  get isFieldError(): boolean {
    return Boolean(this.errors && Object.keys(this.errors).length > 0)
  }

  /** Culpa do servidor ou da rede: 5xx e o status sintético 0. */
  get isServerError(): boolean {
    return this.status >= 500 || this.status === HTTPStatus.NETWORK
  }
}

/**
 * A raiz **pública** da API: o endereço que o navegador de quem acessa alcança.
 *
 * Exportada porque nem tudo que aponta para ela passa por `request()`: o `href`
 * de um download (`GET /storages/:id/download`, que exige sessão e a recebe pelo
 * cookie de mesmo site) e o `src` de uma imagem são o navegador buscando direto,
 * sem `fetch` no meio.
 *
 * **Estes usos precisam do endereço público mesmo quando o valor é montado no
 * SSR**, porque o que sai é HTML que o navegador vai seguir depois. Por isso
 * eles ficam nesta constante e não em `baseUrl()` abaixo: um `href` com o
 * endereço interno seria renderizado no servidor e daria link morto no cliente.
 */
export const BASE_URL = env.VITE_API_URL

/**
 * A raiz da API **para quem está fazendo a requisição agora**, que não é a mesma
 * dos dois lados.
 *
 * O `VITE_API_URL` é embutido no bundle e serve o navegador. Só que no SSR quem
 * chama a API é o Nitro, e obrigá-lo a usar o endereço público faz a requisição
 * sair para a internet e voltar - passando por DNS, TLS e pelo proxy da borda -
 * para alcançar um serviço que quase sempre está na mesma rede. Em produção isso
 * é a maior parte do tempo de uma primeira navegação.
 *
 * `SERVER_API_URL` é a saída: sem o prefixo `VITE_` de propósito, para nunca
 * entrar no bundle do navegador. Ausente, tudo segue como antes - o servidor
 * usa o endereço público, que é o comportamento que este arquivo sempre teve.
 *
 * **`process.env` é lido dentro do `.server()`, e não no escopo do módulo.** Em
 * runtime de borda as variáveis são injetadas por requisição, e um `const` no
 * topo do arquivo roda antes de o ambiente existir e congela `undefined` - o
 * tipo de falha que só aparece em produção. Ver a seção de variáveis de ambiente
 * em `_doc-lib/tanstack-start.md`.
 *
 * `createIsomorphicFn` e não `typeof window`: o ramo de servidor some do bundle
 * do cliente junto com o que ele importa.
 */
const baseUrl = createIsomorphicFn()
  .client((): string => BASE_URL)
  .server((): string => process.env.SERVER_API_URL ?? BASE_URL)

/**
 * No navegador não há nada a fazer: `credentials: 'include'` já leva e traz o
 * cookie, e a especificação proíbe montar o header `Cookie` na mão. No servidor
 * de SSR, quem tem o cookie é o navegador - uma camada acima - e o repasse é
 * obrigatório. Ver `http.server.ts`.
 */
const inboundCookie = createIsomorphicFn()
  .client((): string | undefined => undefined)
  .server(server.inboundCookie)

const applySetCookie = createIsomorphicFn()
  .client((cookie: string | undefined, _response: Response) => cookie)
  .server(server.applySetCookie)

/**
 * O prazo de uma requisição à API, em milissegundos.
 *
 * Não havia prazo nenhum: o único `signal` que chegava ao `fetch` era o do
 * TanStack Query, e ele aborta quando o componente **desmonta**, não quando o
 * tempo passa. Sem teto, um servidor que aceita a conexão e não responde deixa a
 * promessa pendurada até o limite do sistema operacional, que em Node é da ordem
 * de minutos.
 *
 * No navegador isso é uma tela parada. No SSR é pior: `beforeLoad` e `loader`
 * rodam dentro do ciclo de requisição do Nitro, então a resposta HTML inteira
 * fica presa esperando - e quem acessa recebe uma aba girando, sem nada.
 *
 * 15s é folgado de propósito. Este número não existe para apertar o caso comum,
 * e sim para a patologia; quem impõe o ritmo normal é o `retry` de
 * `query-context.ts`.
 */
const TIMEOUT = 15_000

/**
 * O `signal` do chamador somado ao prazo. Vence o primeiro que abortar.
 *
 * `AbortSignal.any` e não um `AbortController` à mão: os dois motivos de aborto
 * são independentes - o componente desmontou, ou o tempo acabou - e qualquer um
 * deles precisa valer. Escolher um só perderia o outro.
 *
 * O timer de `AbortSignal.timeout` não segura o processo vivo e é coletado junto
 * com o signal, então não há o que limpar aqui.
 */
function deadline(signal?: AbortSignal | null): AbortSignal {
  const timeout = AbortSignal.timeout(TIMEOUT)

  if (!signal) return timeout

  return AbortSignal.any([signal, timeout])
}

/**
 * O corpo de erro como chegou, campo a campo: o que não tem o tipo esperado
 * fica de fora e cai no fallback de `perform`. Proxy e HTML de erro não seguem
 * o envelope da API, e o `.json()` devolve o que vier.
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

/** O que `request` usa internamente e nenhum chamador de fora precisa passar. */
type RequestRetry = {
  /** Cookie a usar no lugar do de entrada: o resultado de um refresh no SSR. */
  cookie?: string
  /** Trava do refresh, para o próprio refresh e o replay não dispararem outro. */
  skipRefresh?: boolean
  /** Recebe o header `Cookie` atualizado quando a resposta traz `Set-Cookie`. */
  onSetCookie?: (cookie: string | undefined) => void
}

/**
 * Uma renovação por vez. O backend rotaciona: `refresh.use-case.ts` apaga o
 * refresh token antigo ao emitir o novo, então cinco queries que tomam 401
 * juntas e disparam cinco refreshes gastariam o mesmo token cinco vezes, e
 * quatro delas levariam a sessão embora.
 *
 * "Por vez" precisa de um dono, e o dono é diferente de cada lado. No navegador
 * é o processo: um usuário, uma aba, e a variável de módulo abaixo basta. No
 * servidor de SSR o módulo é compartilhado por todos os visitantes atendidos ao
 * mesmo tempo, e ali o dono é a **requisição** - o escopo que
 * `runInRequestScope` abre em `http.server.ts`, a partir do middleware de
 * `src/start.ts`.
 *
 * `createIsomorphicFn` é o que entrega a versão certa a cada lado, e o ramo de
 * servidor some do bundle do cliente junto com o import dele.
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
    // Fora de um ciclo de requisição - teste, script - não há escopo aberto, e
    // a renovação simplesmente não é compartilhada. Deduplicar é otimização,
    // não correção: cada chamada ainda renova por conta própria.
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
 * `fetch` com duas garantias a mais: resposta de erro vira exceção, e sessão
 * expirada é renovada sem que a tela perceba. Todo caminho de falha - rede,
 * corpo ilegível, erro da API - sai daqui como `HTTPError` com `status`
 * preenchido, então quem trata nunca precisa de `instanceof`.
 *
 * Não há token em `localStorage`, `sessionStorage` ou `document.cookie`: os
 * dois cookies do backend são `httpOnly` e assinados, e o JavaScript da página
 * não os lê nem os escreve. Quem está logado se descobre perguntando à API.
 *
 * Devolve a resposta já aprovada; ler (ou não) o corpo é com `request` e `send`.
 */
async function perform(
  path: string,
  init?: RequestInit,
  retry?: RequestRetry,
): Promise<Response> {
  const cookie = retry?.cookie ?? inboundCookie()

  /**
   * `FormData` monta o próprio `Content-Type`, com o `boundary` que separa as
   * partes. Declarar `application/json` por cima faria o servidor procurar o
   * boundary num cabeçalho que não o tem, e o corpo chegaria vazio.
   *
   * Aqui e não em cada chamador: nenhuma rota do Ciclo 1 manda `FormData` - o
   * binário vai do navegador direto ao bucket -, e um `Content-Type` esquecido
   * num envio futuro falharia do mesmo jeito.
   */
  // O idioma da tela vai junto (_standards/i18n.md §2): a API responde a
  // mensagem de erro e a 422 nele. `Accept-Language` é cabeçalho da lista
  // segura do CORS, então não cobra preflight. No SSR, `getLocale()` lê o idioma
  // da requisição que o middleware do Paraglide abriu.
  const headers: Record<string, string> = { 'Accept-Language': getLocale() }
  //
  // `init?.body &&` na frente: sem corpo não há tipo de conteúdo a declarar, e
  // um `Content-Type: application/json` num GET é cabeçalho que não descreve
  // nada. Pior que inútil - é o que faz um GET simples deixar de ser requisição
  // CORS simples e passar a exigir preflight, ou seja um `OPTIONS` a mais antes
  // de cada leitura.
  if (init?.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  let response: Response

  try {
    response = await fetch(baseUrl().concat(path), {
      ...init,
      // O sign-in responde 204 e devolve os tokens em cookie
      // (`app/services/cookie.ts`). Sem isto o login "funciona" e não autentica.
      credentials: 'include',
      // Depois do spread de `init`, senão o `signal` do chamador sobrescreveria
      // o prazo e a requisição voltaria a não ter teto.
      signal: deadline(init?.signal),
      headers: {
        ...headers,
        ...(cookie && { cookie }),
        ...init?.headers,
      },
    })
  } catch {
    // `fetch` só rejeita aqui: sem resposta, logo sem status real.
    throw new HTTPError({
      message: 'Não foi possível conectar ao servidor. Tente novamente.',
      status: HTTPStatus.NETWORK,
      code: HTTPErrorCode.NETWORK_ERROR,
    })
  }

  // Fora do `?.` do callback de propósito: o encadeamento opcional não avalia
  // o argumento quando o callback não existe, e o repasse do `Set-Cookie` ao
  // navegador vale para toda resposta, não só para a do refresh.
  const renewedCookie = applySetCookie(cookie, response)
  retry?.onSetCookie?.(renewedCookie)

  if (!response.ok) {
    // Corpo ilegível (HTML de proxy, resposta vazia) vira um HTTPError com o
    // status real mesmo assim - a UI nunca recebe um erro sem `status`.
    let body: Partial<IHTTPErrorBody> | null = null

    try {
      body = errorBody(await response.json())
    } catch {
      body = null
    }

    if (
      response.status === HTTPStatus.UNAUTHORIZED &&
      body?.code === HTTPErrorCode.UNAUTHORIZED &&
      !retry?.skipRefresh
    ) {
      // Se o refresh também falhar, o `HTTPError` dele sobe daqui e o guard da
      // rota trata como não autenticado - que é exatamente o que é.
      const renewed = await renew(cookie)
      return await perform(path, init, {
        cookie: renewed,
        skipRefresh: true,
      })
    }

    throw new HTTPError({
      message: body?.message ?? 'Erro inesperado. Tente novamente.',
      status: body?.status ?? response.status,
      code: body?.code ?? HTTPErrorCode.UNKNOWN_ERROR,
      errors: body?.errors,
    })
  }

  return response
}

/** Requisição que devolve um registro: o corpo JSON tipado como `T`. */
export async function request<T>(
  path: string,
  init?: RequestInit,
  retry?: RequestRetry,
): Promise<T> {
  const response = await perform(path, init, retry)

  // Quem pede um `T` e recebe 204 está chamando a rota errada - e `.json()`
  // estouraria com um `SyntaxError`, fora do contrato de sempre `HTTPError`.
  if (response.status === HTTPStatus.NO_CONTENT) {
    throw new HTTPError({
      message: 'A API respondeu sem corpo onde se esperava um registro.',
      status: response.status,
      code: HTTPErrorCode.UNKNOWN_ERROR,
    })
  }

  const body: unknown = await response.json()

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- fronteira do `fetch` (lib.dom, `Response.json()`): o corpo de sucesso não tem schema no cliente (`lib/interfaces.ts` explica por quê), e o `T` é o contrato que cada `queryOptions`/mutation declara.
  return body as T
}

/**
 * Requisição sem retorno: sign-in, sign-out, arquivamento, exclusão e purge.
 * Respondem 204, e o corpo nunca é lido - `.json()` estouraria em corpo vazio.
 */
export async function send(
  path: string,
  init?: RequestInit,
  retry?: RequestRetry,
): Promise<void> {
  await perform(path, init, retry)
}
