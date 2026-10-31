import { expect, test } from 'vitest'

import {
  mergeCookieHeader,
  requestScope,
  runInRequestScope,
} from './http.server'

test('replaces the pair that already existed and preserves the rest', () => {
  const merged = mergeCookieHeader('access-token=s:velho.aaa; outro=1', [
    'access-token=s:novo.bbb; Path=/; HttpOnly; Max-Age=86400',
  ])

  expect(merged).toBe('access-token=s:novo.bbb; outro=1')
})

test('appends the pair that did not exist yet', () => {
  const merged = mergeCookieHeader('outro=1', [
    'refresh-token=s:novo.ccc; Path=/; HttpOnly',
  ])

  expect(merged).toBe('outro=1; refresh-token=s:novo.ccc')
})

test('starts from an absent header', () => {
  expect(
    mergeCookieHeader(undefined, ['access-token=s:novo.bbb; Path=/']),
  ).toBe('access-token=s:novo.bbb')
})

test('does not split the signed value at the inner `=`', () => {
  // AdonisJS's signed value is base64 and can end in `=`.
  const merged = mergeCookieHeader(undefined, [
    'access-token=s:abc==.hmac; Path=/',
  ])

  expect(merged).toBe('access-token=s:abc==.hmac')
})

test('when outside a request cycle, there is no scope', () => {
  expect(requestScope()).toBeUndefined()
})

test('makes the scope visible from inside and gone on exit', () => {
  const inside = runInRequestScope(() => requestScope())

  expect(inside).toEqual({ renewal: null })
  expect(requestScope()).toBeUndefined()
})

test('does not share scope between two concurrent runs', async () => {
  // This is the case that motivates the file: two visitors served by the same
  // SSR process at the same time. If the scope leaked from one to the other, one's
  // token renewal would be reused by the other - and the backend rotates,
  // so the second would end up with a cookie that is no longer valid.
  async function visitor(mark: string) {
    return runInRequestScope(async () => {
      const scope = requestScope()
      if (!scope) throw new Error('esperava escopo dentro de runInRequestScope')
      scope.renewal = Promise.resolve(mark)

      // Yields the turn: without AsyncLocalStorage, this is where the other visitor
      // would overwrite this one's state.
      await new Promise((resolve) => setTimeout(resolve, 0))

      const after = requestScope()
      if (!after) throw new Error('o escopo sumiu depois do await')
      return await after.renewal
    })
  }

  const [a, b] = await Promise.all([visitor('a'), visitor('b')])

  expect(a).toBe('a')
  expect(b).toBe('b')
})
