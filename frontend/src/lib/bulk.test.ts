import { describe, expect, it } from 'vitest'

import { bulkMessage, runBulk } from './bulk'

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

describe('bulkMessage', () => {
  it('flexiona o singular quando só um passou', () => {
    expect(bulkMessage({ done: 1, failed: 0 }, 'arquivados')).toBe(
      '1 arquivado.',
    )
  })

  it('usa o plural quando todos passaram', () => {
    expect(bulkMessage({ done: 4, failed: 0 }, 'arquivados')).toBe(
      '4 arquivados.',
    )
  })

  it('relata parcial em vez de dizer só que deu erro', () => {
    expect(bulkMessage({ done: 7, failed: 2 }, 'arquivados')).toBe(
      '7 de 9 arquivados; 2 falharam.',
    )
  })

  it('diz que nenhum passou quando todos falharam', () => {
    expect(bulkMessage({ done: 0, failed: 3 }, 'excluídos')).toBe(
      'Nenhum excluído: 3 falharam.',
    )
  })
})
