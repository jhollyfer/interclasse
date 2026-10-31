import { describe, expect, it } from 'vitest'

import { HTTPError, HTTPStatus } from './http'
import { shouldRetryQuery } from './query-context'

function httpError(status: number): HTTPError {
  return new HTTPError({ message: 'falhou', status, code: 'X' })
}

describe('shouldRetryQuery', () => {
  it('does not retry 4xx: the response does not change on the next attempt', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetryQuery(0, httpError(status))).toBe(false)
    }
  })

  it('retries 5xx and network failure up to the cap', () => {
    expect(shouldRetryQuery(0, httpError(500))).toBe(true)
    expect(shouldRetryQuery(2, httpError(HTTPStatus.NETWORK))).toBe(true)
    expect(shouldRetryQuery(3, httpError(503))).toBe(false)
  })

  it('retries an error that did not come from `request`, like a TypeError', () => {
    expect(shouldRetryQuery(0, new TypeError('x'))).toBe(true)
  })
})
