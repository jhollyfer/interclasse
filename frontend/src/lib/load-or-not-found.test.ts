import { isNotFound } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'

import { loadOrNotFound } from './load-or-not-found'

function failure(status: number): HTTPError {
  return new HTTPError({ message: 'falha', status, code: 'X' })
}

/** Captura a rejeição já como `unknown`, sem `.catch((e) => e)` tipado. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }

  throw new Error('esperava rejeição, a promessa resolveu')
}

describe('loadOrNotFound', () => {
  it('devolve o que a leitura devolve', async () => {
    await expect(loadOrNotFound(async () => 'ok')).resolves.toBe('ok')
  })

  it('converte 404 em notFound', async () => {
    const error = await rejection(
      loadOrNotFound(async () => {
        throw failure(HTTPStatus.NOT_FOUND)
      }),
    )

    expect(isNotFound(error)).toBe(true)
  })

  it('deixa 403 e 500 subirem como estão', async () => {
    for (const status of [
      HTTPStatus.FORBIDDEN,
      HTTPStatus.INTERNAL_SERVER_ERROR,
    ]) {
      const error = await rejection(
        loadOrNotFound(async () => {
          throw failure(status)
        }),
      )

      expect(isNotFound(error)).toBe(false)
      expect(error).toBeInstanceOf(HTTPError)
    }
  })
})
