import { expect, test } from 'vitest'
import {
  mergeCookieHeader,
  requestScope,
  runInRequestScope,
} from './http.server'

test('substitui o par que já existia e preserva o resto', () => {
  const merged = mergeCookieHeader('access-token=s:velho.aaa; outro=1', [
    'access-token=s:novo.bbb; Path=/; HttpOnly; Max-Age=86400',
  ])

  expect(merged).toBe('access-token=s:novo.bbb; outro=1')
})

test('acrescenta o par que ainda não existia', () => {
  const merged = mergeCookieHeader('outro=1', [
    'refresh-token=s:novo.ccc; Path=/; HttpOnly',
  ])

  expect(merged).toBe('outro=1; refresh-token=s:novo.ccc')
})

test('parte de um header ausente', () => {
  expect(
    mergeCookieHeader(undefined, ['access-token=s:novo.bbb; Path=/']),
  ).toBe('access-token=s:novo.bbb')
})

test('não parte o valor assinado no `=` interno', () => {
  // O valor assinado do AdonisJS é base64 e pode terminar em `=`.
  const merged = mergeCookieHeader(undefined, [
    'access-token=s:abc==.hmac; Path=/',
  ])

  expect(merged).toBe('access-token=s:abc==.hmac')
})

test('fora de um ciclo de requisição não há escopo', () => {
  expect(requestScope()).toBeUndefined()
})

test('o escopo é visível de dentro e some ao sair', () => {
  const inside = runInRequestScope(() => requestScope())

  expect(inside).toEqual({ renewal: null })
  expect(requestScope()).toBeUndefined()
})

test('duas execuções concorrentes não compartilham escopo', async () => {
  // É o caso que motiva o arquivo: dois visitantes atendidos pelo mesmo
  // processo de SSR ao mesmo tempo. Se o escopo vazasse de um para o outro, a
  // renovação de token de um seria reusada pelo outro - e o backend rotaciona,
  // então o segundo terminaria com um cookie que já não vale.
  async function visitor(marca: string) {
    return runInRequestScope(async () => {
      const scope = requestScope()
      scope!.renewal = Promise.resolve(marca)

      // Cede o turno: sem o AsyncLocalStorage, é aqui que o outro visitante
      // sobrescreveria o estado deste.
      await new Promise((resolve) => setTimeout(resolve, 0))

      return await requestScope()!.renewal
    })
  }

  const [a, b] = await Promise.all([visitor('a'), visitor('b')])

  expect(a).toBe('a')
  expect(b).toBe('b')
})
