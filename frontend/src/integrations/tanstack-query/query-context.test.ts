import { describe, expect, it } from 'vitest'

import { HTTPError, HTTPStatus } from './http'
import { shouldRetryQuery } from './query-context'

function httpError(status: number): HTTPError {
  return new HTTPError({ message: 'falhou', status, code: 'X' })
}

describe('shouldRetryQuery', () => {
  it('não repete 4xx: a resposta não muda na tentativa seguinte', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetryQuery(0, httpError(status))).toBe(false)
    }
  })

  it('repete 5xx e falha de rede até o teto', () => {
    expect(shouldRetryQuery(0, httpError(500))).toBe(true)
    expect(shouldRetryQuery(2, httpError(HTTPStatus.NETWORK))).toBe(true)
    expect(shouldRetryQuery(3, httpError(503))).toBe(false)
  })

  it('repete erro que não veio de `request`, como um TypeError', () => {
    expect(shouldRetryQuery(0, new TypeError('x'))).toBe(true)
  })
})
