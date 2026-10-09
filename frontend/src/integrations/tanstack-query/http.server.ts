/**
 * As partes de `request` que só existem no servidor de SSR.
 *
 * Com SSR, a primeira navegação é renderizada pelo Nitro, e é o Nitro - não o
 * navegador - que fala com o AdonisJS. O `credentials: 'include'` do `fetch` não
 * ajuda ali: quem tem o cookie é o navegador, e ele ficou uma camada acima. Sem
 * o repasse daqui, todo `beforeLoad` renderizado no servidor veria 401.
 *
 * Este módulo importa `@tanstack/react-start/server` e por isso nunca pode
 * entrar no bundle do navegador. Quem o consome é o `.server()` de um
 * `createIsomorphicFn` em `http.ts`, e o plugin do Start remove do build do
 * cliente tanto a chamada quanto este import.
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import { getRequestHeader, getResponse } from '@tanstack/react-start/server'

/**
 * O que precisa valer por requisição, e não por processo.
 *
 * Hoje só a renovação de token mora aqui. Ela precisa deste escopo porque o
 * backend **rotaciona**: `refresh.use-case.ts` apaga o refresh token antigo ao
 * emitir o novo. Uma promessa de renovação guardada no módulo seria
 * compartilhada por todos os visitantes que o servidor de SSR atende ao mesmo
 * tempo, e a segunda requisição a reusá-la terminaria segurando um cookie que
 * o backend já invalidou.
 *
 * É a mesma regra que faz o `QueryClient` nascer por requisição em
 * `query-context.ts` - no servidor, o escopo do módulo é o escopo de todo
 * mundo.
 */
export type RequestScope = {
  renewal: Promise<string | undefined> | null
}

const storage = new AsyncLocalStorage<RequestScope>()

/**
 * Abre um escopo e roda `fn` dentro dele. Quem chama é o middleware de request
 * registrado em `src/start.ts`, que o Start executa antes de toda requisição -
 * SSR, server route e server function.
 */
export function runInRequestScope<T>(fn: () => T): T {
  return storage.run({ renewal: null }, fn)
}

/**
 * O escopo da requisição em curso, ou `undefined` fora de uma - teste, script,
 * qualquer código que rode sem o middleware ter aberto o escopo.
 */
export function requestScope(): RequestScope | undefined {
  return storage.getStore()
}

/**
 * O header `Cookie` que o navegador mandou ao Nitro, para ser repassado literal
 * ao AdonisJS.
 *
 * Literal é requisito, não preferência: o `response.cookie()` do AdonisJS assina
 * o valor (`s:<base64>.<hmac>` verificado com a `APP_KEY`), então ler, remontar
 * ou reinterpretar qualquer parte dele invalida a assinatura.
 */
export function inboundCookie(): string | undefined {
  try {
    return getRequestHeader('cookie')
  } catch {
    // Fora de um ciclo de requisição - teste, script - não há cookie a repassar.
    return undefined
  }
}

/**
 * Copia os `Set-Cookie` que o AdonisJS devolveu para a resposta que o Nitro vai
 * mandar ao navegador, e devolve o header `Cookie` já atualizado.
 *
 * O retorno é o que faz o replay depois de um refresh usar o cookie novo. O
 * backend apaga o refresh token antigo ao rotacionar (`refresh.use-case.ts`),
 * então repetir a requisição com o cookie de entrada gastaria um token que
 * acabou de deixar de existir, e derrubaria a sessão recém-criada.
 */
export function applySetCookie(
  cookie: string | undefined,
  response: Response,
): string | undefined {
  const values = response.headers.getSetCookie()

  if (!values.length) return cookie

  try {
    const headers = getResponse().headers
    for (const value of values) headers.append('set-cookie', value)
  } catch {
    // idem `inboundCookie`: sem requisição em curso, não há onde escrever.
  }

  return mergeCookieHeader(cookie, values)
}

/**
 * Aplica sobre um header `Cookie` os pares `nome=valor` de uma lista de
 * `Set-Cookie`: substitui o que já existe, acrescenta o que não existe.
 *
 * Exportada para teste - é a única lógica deste arquivo que não é uma chamada
 * direta ao Start.
 */
export function mergeCookieHeader(
  cookie: string | undefined,
  setCookies: Array<string>,
): string {
  const pairs = new Map<string, string>()

  for (const entry of cookie?.split(';') ?? []) {
    const separator = entry.indexOf('=')
    if (separator < 0) continue
    pairs.set(entry.slice(0, separator).trim(), entry.slice(separator + 1))
  }

  for (const value of setCookies) {
    // O par vem antes do primeiro `;`. O resto são atributos (`Path`,
    // `HttpOnly`, `Max-Age`) que não existem no header `Cookie`.
    const [pair] = value.split(';')
    const separator = pair.indexOf('=')
    if (separator < 0) continue
    pairs.set(pair.slice(0, separator).trim(), pair.slice(separator + 1))
  }

  return Array.from(pairs, ([name, value]) => `${name}=${value}`).join('; ')
}
