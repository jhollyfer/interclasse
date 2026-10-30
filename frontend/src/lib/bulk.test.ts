import { describe, expect, it } from 'vitest'

import { runBulk } from './bulk'

describe('runBulk', () => {
  it('conta o que passou e o que falhou sem abortar no primeiro erro', async () => {
    const tocados: Array<number> = []

    const outcome = await runBulk([1, 2, 3, 4], async (item) => {
      tocados.push(item)
      if (item % 2 === 0) throw new Error('falhou')
    })

    expect(outcome).toEqual({ done: 2, failed: 2 })
    // O ponto de usar `allSettled`: a falha do 2 não impediu o 3 e o 4.
    expect(tocados).toEqual([1, 2, 3, 4])
  })

  it('devolve zerado para lista vazia', async () => {
    expect(await runBulk([], async () => undefined)).toEqual({
      done: 0,
      failed: 0,
    })
  })
})
